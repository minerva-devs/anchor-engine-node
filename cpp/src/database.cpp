/**
 * @file database.cpp
 * @brief SQLite database implementation for Anchor Core
 */

#include "database.h"
#include <sstream>
#include <stdexcept>
#include <cstring>
#include <iomanip>

namespace anchor {

Database::Database(const std::string& path) : db_(nullptr) {
    open(path);
}

Database::~Database() {
    close();
}

Database::Database(Database&& other) noexcept : db_(other.db_) {
    other.db_ = nullptr;
}

Database& Database::operator=(Database&& other) noexcept {
    if (this != &other) {
        close();
        db_ = other.db_;
        other.db_ = nullptr;
    }
    return *this;
}

Database Database::inMemory() {
    Database db("");
    sqlite3_open(":memory:", &db.db_);
    db.migrate();
    return db;
}

void Database::open(const std::string& path) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (path.empty()) {
        // In-memory database
        if (sqlite3_open(":memory:", &db_) != SQLITE_OK) {
            throw DatabaseError("Failed to open in-memory database");
        }
    } else {
        // File database
        if (sqlite3_open(path.c_str(), &db_) != SQLITE_OK) {
            throw DatabaseError("Failed to open database: " + path);
        }
    }
    
    enableForeignKeys();
    enableWALMode();
    migrate();
}

void Database::close() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;
    }
}

void Database::enableForeignKeys() {
    char* errMsg = nullptr;
    if (sqlite3_exec(db_, "PRAGMA foreign_keys = ON", nullptr, nullptr, &errMsg) != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to enable foreign keys: " + error);
    }
}

void Database::enableWALMode() {
    char* errMsg = nullptr;
    if (sqlite3_exec(db_, "PRAGMA journal_mode = WAL", nullptr, nullptr, &errMsg) != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to enable WAL mode: " + error);
    }
}

void Database::migrate() {
    char* errMsg = nullptr;
    int rc;
    
    // Create sources table
    rc = sqlite3_exec(db_,
        "CREATE TABLE IF NOT EXISTS sources ("
        "  id TEXT PRIMARY KEY,"
        "  path TEXT NOT NULL UNIQUE,"
        "  bucket TEXT,"
        "  created_at REAL NOT NULL,"
        "  updated_at REAL NOT NULL,"
        "  metadata TEXT"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create sources table: " + error);
    }
    
    // Create atoms table
    rc = sqlite3_exec(db_,
        "CREATE TABLE IF NOT EXISTS atoms ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  source_id TEXT NOT NULL,"
        "  content TEXT NOT NULL,"
        "  char_start INTEGER NOT NULL,"
        "  char_end INTEGER NOT NULL,"
        "  timestamp REAL NOT NULL,"
        "  simhash TEXT NOT NULL,"
        "  metadata TEXT,"
        "  compound_id TEXT,"
        "  start_byte INTEGER,"
        "  end_byte INTEGER,"
        "  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create atoms table: " + error);
    }
    
    // Create tags table
    rc = sqlite3_exec(db_,
        "CREATE TABLE IF NOT EXISTS tags ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  atom_id INTEGER NOT NULL,"
        "  tag TEXT NOT NULL,"
        "  bucket TEXT,"
        "  FOREIGN KEY (atom_id) REFERENCES atoms(id) ON DELETE CASCADE"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create tags table: " + error);
    }
    
    // Create molecules table
    rc = sqlite3_exec(db_,
        "CREATE TABLE IF NOT EXISTS molecules ("
        "  id TEXT PRIMARY KEY,"
        "  compound_id TEXT NOT NULL,"
        "  content TEXT NOT NULL,"
        "  start_byte INTEGER NOT NULL,"
        "  end_byte INTEGER NOT NULL,"
        "  timestamp REAL NOT NULL,"
        "  simhash TEXT NOT NULL"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create molecules table: " + error);
    }
    
    // Create edges table for graph traversal
    rc = sqlite3_exec(db_,
        "CREATE TABLE IF NOT EXISTS edges ("
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "  from_atom INTEGER NOT NULL,"
        "  to_atom INTEGER NOT NULL,"
        "  weight REAL NOT NULL,"
        "  edge_type TEXT NOT NULL,"
        "  FOREIGN KEY (from_atom) REFERENCES atoms(id) ON DELETE CASCADE,"
        "  FOREIGN KEY (to_atom) REFERENCES atoms(id) ON DELETE CASCADE"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create edges table: " + error);
    }
    
    // Create indexes
    const char* indexes[] = {
        "CREATE INDEX IF NOT EXISTS idx_atoms_source ON atoms(source_id)",
        "CREATE INDEX IF NOT EXISTS idx_atoms_simhash ON atoms(simhash)",
        "CREATE INDEX IF NOT EXISTS idx_atoms_compound ON atoms(compound_id)",
        "CREATE INDEX IF NOT EXISTS idx_tags_atom ON tags(atom_id)",
        "CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)",
        "CREATE INDEX IF NOT EXISTS idx_molecules_compound ON molecules(compound_id)",
        "CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_atom)",
        "CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_atom)",
        nullptr
    };
    
    for (int i = 0; indexes[i] != nullptr; i++) {
        rc = sqlite3_exec(db_, indexes[i], nullptr, nullptr, &errMsg);
        if (rc != SQLITE_OK) {
            std::string error = errMsg;
            sqlite3_free(errMsg);
            throw DatabaseError("Failed to create index: " + error);
        }
    }
    
    // Create FTS5 virtual table for atoms content
    rc = sqlite3_exec(db_,
        "CREATE VIRTUAL TABLE IF NOT EXISTS atoms_fts USING fts5("
        "  content,"
        "  content='atoms',"
        "  content_rowid='id'"
        ")",
        nullptr, nullptr, &errMsg
    );
    if (rc != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to create FTS table: " + error);
    }
    
    // Create triggers to keep FTS in sync
    const char* triggers[] = {
        "CREATE TRIGGER IF NOT EXISTS atoms_ai AFTER INSERT ON atoms BEGIN "
        "  INSERT INTO atoms_fts(rowid, content) VALUES (new.id, new.content);"
        "END",
        "CREATE TRIGGER IF NOT EXISTS atoms_ad AFTER DELETE ON atoms BEGIN "
        "  INSERT INTO atoms_fts(atoms_fts, rowid, content) VALUES('delete', old.id, old.content);"
        "END",
        "CREATE TRIGGER IF NOT EXISTS atoms_au AFTER UPDATE ON atoms BEGIN "
        "  INSERT INTO atoms_fts(atoms_fts, rowid, content) VALUES('delete', old.id, old.content);"
        "  INSERT INTO atoms_fts(rowid, content) VALUES (new.id, new.content);"
        "END",
        nullptr
    };
    
    for (int i = 0; triggers[i] != nullptr; i++) {
        rc = sqlite3_exec(db_, triggers[i], nullptr, nullptr, &errMsg);
        if (rc != SQLITE_OK) {
            std::string error = errMsg;
            sqlite3_free(errMsg);
            throw DatabaseError("Failed to create trigger: " + error);
        }
    }
}

DbStats Database::getStats() const {
    std::lock_guard<std::mutex> lock(mutex_);
    DbStats stats = {0, 0, 0};
    
    // Count atoms
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db_, "SELECT COUNT(*) FROM atoms", -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            stats.atom_count = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }
    
    // Count sources
    if (sqlite3_prepare_v2(db_, "SELECT COUNT(*) FROM sources", -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            stats.source_count = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }
    
    // Count unique tags
    if (sqlite3_prepare_v2(db_, "SELECT COUNT(DISTINCT tag) FROM tags", -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            stats.tag_count = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }
    
    return stats;
}

void Database::wipeAllData() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    const char* statements[] = {
        "DELETE FROM edges",
        "DELETE FROM tags",
        "DELETE FROM molecules",
        "DELETE FROM atoms",
        "DELETE FROM sources",
        "DELETE FROM sqlite_sequence WHERE name='atoms'",
        "DELETE FROM sqlite_sequence WHERE name='tags'",
        "DELETE FROM sqlite_sequence WHERE name='molecules'",
        "DELETE FROM sqlite_sequence WHERE name='edges'",
        "DELETE FROM atoms_fts",
        nullptr
    };
    
    for (int i = 0; statements[i] != nullptr; i++) {
        sqlite3_exec(db_, statements[i], nullptr, nullptr, nullptr);
    }
}

bool Database::isEmpty() const {
    std::lock_guard<std::mutex> lock(mutex_);
    sqlite3_stmt* stmt;
    bool empty = true;
    
    if (sqlite3_prepare_v2(db_, "SELECT COUNT(*) FROM atoms", -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            empty = (sqlite3_column_int(stmt, 0) == 0);
        }
        sqlite3_finalize(stmt);
    }
    
    return empty;
}

void Database::rebuildFtsIndex() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_exec(db_, "DELETE FROM atoms_fts", nullptr, nullptr, nullptr);
    sqlite3_exec(db_, 
        "INSERT INTO atoms_fts(rowid, content) SELECT id, content FROM atoms",
        nullptr, nullptr, nullptr);
}

// ==================== Source Operations ====================

void Database::upsertSource(const Source& source) {
    std::lock_guard<std::mutex> lock(mutex_);

    std::string metadata_str = "NULL";
    if (source.metadata.has_value()) {
        // Serialize JSON to string and escape single quotes
        std::string escaped = source.metadata.value().dump();
        size_t pos = 0;
        while ((pos = escaped.find("'", pos)) != std::string::npos) {
            escaped.replace(pos, 1, "''");
            pos += 2;
        }
        metadata_str = "'" + escaped + "'";
    }
    
    std::string bucket_str = source.bucket.has_value() ? "'" + *source.bucket + "'" : "NULL";
    
    std::stringstream sql;
    sql << "INSERT OR REPLACE INTO sources (id, path, bucket, created_at, updated_at, metadata) "
        << "VALUES ('" << source.id << "', '" << source.path << "', "
        << bucket_str << ", " << source.created_at << ", " << source.updated_at << ", "
        << metadata_str << ")";
    
    char* errMsg = nullptr;
    if (sqlite3_exec(db_, sql.str().c_str(), nullptr, nullptr, &errMsg) != SQLITE_OK) {
        std::string error = errMsg;
        sqlite3_free(errMsg);
        throw DatabaseError("Failed to upsert source: " + error);
    }
}

Source Database::getSource(const SourceId& id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_stmt* stmt;
    std::string sql = "SELECT id, path, bucket, created_at, updated_at, metadata FROM sources WHERE id = ?";
    
    if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_STATIC);
    
    Source source;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        source.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        source.path = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        
        if (sqlite3_column_type(stmt, 2) != SQLITE_NULL) {
            source.bucket = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        }
        
        source.created_at = sqlite3_column_double(stmt, 3);
        source.updated_at = sqlite3_column_double(stmt, 4);
        
        if (sqlite3_column_type(stmt, 5) != SQLITE_NULL) {
            std::string metadata_json = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            try {
                source.metadata = nlohmann::json::parse(metadata_json);
            } catch (const nlohmann::json::parse_error&) {
                // Ignore parsing errors
            }
        }
    } else {
        sqlite3_finalize(stmt);
        throw DatabaseError("Source not found: " + id);
    }
    
    sqlite3_finalize(stmt);
    return source;
}

std::vector<Source> Database::listSources() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Source> sources;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, path, bucket, created_at, updated_at, metadata FROM sources";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Source source;
        source.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        source.path = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        
        if (sqlite3_column_type(stmt, 2) != SQLITE_NULL) {
            source.bucket = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        }
        
        source.created_at = sqlite3_column_double(stmt, 3);
        source.updated_at = sqlite3_column_double(stmt, 4);
        
        if (sqlite3_column_type(stmt, 5) != SQLITE_NULL) {
            std::string metadata_json = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            try {
                source.metadata = nlohmann::json::parse(metadata_json);
            } catch (const nlohmann::json::parse_error&) {
                // Ignore parsing errors
            }
        }

        sources.push_back(source);
    }
    
    sqlite3_finalize(stmt);
    return sources;
}

void Database::deleteSource(const SourceId& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_stmt* stmt;
    const char* sql = "DELETE FROM sources WHERE id = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_STATIC);
    
    if (sqlite3_step(stmt) != SQLITE_DONE || sqlite3_changes(db_) == 0) {
        sqlite3_finalize(stmt);
        throw DatabaseError("Source not found: " + id);
    }
    
    sqlite3_finalize(stmt);
}

// ==================== Atom Operations ====================

AtomId Database::insertAtom(const Atom& atom) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::stringstream sql;
    sql << "INSERT INTO atoms (source_id, content, char_start, char_end, timestamp, simhash, metadata, compound_id, start_byte, end_byte) "
        << "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db_, sql.str().c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, atom.source_id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, atom.content.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 3, static_cast<int>(atom.char_start));
    sqlite3_bind_int(stmt, 4, static_cast<int>(atom.char_end));
    sqlite3_bind_double(stmt, 5, atom.timestamp);
    
    std::stringstream simhash_ss;
    simhash_ss << "0x" << std::hex << atom.simhash;
    std::string simhash_hex = simhash_ss.str();
    sqlite3_bind_text(stmt, 6, simhash_hex.c_str(), -1, SQLITE_TRANSIENT);
    
    // TODO: Bind metadata, compound_id, start_byte, end_byte
    
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw DatabaseError("Failed to insert atom");
    }
    
    AtomId id = static_cast<AtomId>(sqlite3_last_insert_rowid(db_));
    sqlite3_finalize(stmt);
    return id;
}

std::vector<AtomId> Database::insertAtomsBatch(const std::vector<Atom>& atoms) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_exec(db_, "BEGIN TRANSACTION", nullptr, nullptr, nullptr);
    
    std::vector<AtomId> ids;
    ids.reserve(atoms.size());
    
    for (const auto& atom : atoms) {
        ids.push_back(insertAtom(atom));
    }
    
    sqlite3_exec(db_, "COMMIT", nullptr, nullptr, nullptr);
    return ids;
}

Atom Database::getAtom(AtomId id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, source_id, content, char_start, char_end, timestamp, simhash, metadata, compound_id, start_byte, end_byte "
                      "FROM atoms WHERE id = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_int(stmt, 1, static_cast<int>(id));
    
    Atom atom;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        atom.id = sqlite3_column_int(stmt, 0);
        atom.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        atom.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        atom.char_start = sqlite3_column_int(stmt, 3);
        atom.char_end = sqlite3_column_int(stmt, 4);
        atom.timestamp = sqlite3_column_double(stmt, 5);
        
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        atom.simhash = std::stoull(simhash_str, nullptr, 16);
        
        // TODO: Parse metadata, compound_id, start_byte, end_byte
    } else {
        sqlite3_finalize(stmt);
        throw DatabaseError("Atom not found: " + std::to_string(id));
    }
    
    sqlite3_finalize(stmt);
    return atom;
}

std::vector<Atom> Database::getAtomsBySource(const SourceId& source_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Atom> atoms;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, source_id, content, char_start, char_end, timestamp, simhash "
                      "FROM atoms WHERE source_id = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, source_id.c_str(), -1, SQLITE_STATIC);
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Atom atom;
        atom.id = sqlite3_column_int(stmt, 0);
        atom.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        atom.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        atom.char_start = sqlite3_column_int(stmt, 3);
        atom.char_end = sqlite3_column_int(stmt, 4);
        atom.timestamp = sqlite3_column_double(stmt, 5);
        
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        atom.simhash = std::stoull(simhash_str, nullptr, 16);
        
        atoms.push_back(atom);
    }
    
    sqlite3_finalize(stmt);
    return atoms;
}

std::vector<Atom> Database::searchAtoms(const std::string& query, size_t limit) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Atom> atoms;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT a.id, a.source_id, a.content, a.char_start, a.char_end, a.timestamp, a.simhash "
                      "FROM atoms a "
                      "JOIN atoms_fts fts ON a.id = fts.rowid "
                      "WHERE atoms_fts MATCH ? "
                      "ORDER BY rank "
                      "LIMIT ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, query.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 2, static_cast<int>(limit));
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Atom atom;
        atom.id = sqlite3_column_int(stmt, 0);
        atom.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        atom.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        atom.char_start = sqlite3_column_int(stmt, 3);
        atom.char_end = sqlite3_column_int(stmt, 4);
        atom.timestamp = sqlite3_column_double(stmt, 5);
        
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        atom.simhash = std::stoull(simhash_str, nullptr, 16);
        
        atoms.push_back(atom);
    }
    
    sqlite3_finalize(stmt);
    return atoms;
}

std::vector<Atom> Database::getAllAtoms() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Atom> atoms;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, source_id, content, char_start, char_end, timestamp, simhash "
                      "FROM atoms";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Atom atom;
        atom.id = sqlite3_column_int(stmt, 0);
        atom.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        atom.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        atom.char_start = sqlite3_column_int(stmt, 3);
        atom.char_end = sqlite3_column_int(stmt, 4);
        atom.timestamp = sqlite3_column_double(stmt, 5);
        
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        atom.simhash = std::stoull(simhash_str, nullptr, 16);
        
        atoms.push_back(atom);
    }
    
    sqlite3_finalize(stmt);
    return atoms;
}

void Database::deleteAtom(AtomId id) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_stmt* stmt;
    const char* sql = "DELETE FROM atoms WHERE id = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_int(stmt, 1, static_cast<int>(id));
    
    if (sqlite3_step(stmt) != SQLITE_DONE || sqlite3_changes(db_) == 0) {
        sqlite3_finalize(stmt);
        throw DatabaseError("Atom not found: " + std::to_string(id));
    }
    
    sqlite3_finalize(stmt);
}

// ==================== Tag Operations ====================

void Database::addTags(AtomId atom_id, const std::vector<Tag>& tags) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    for (const auto& tag : tags) {
        sqlite3_stmt* stmt;
        const char* sql = "INSERT INTO tags (atom_id, tag, bucket) VALUES (?, ?, ?)";
        
        if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            throw DatabaseError("Failed to prepare statement");
        }
        
        sqlite3_bind_int(stmt, 1, static_cast<int>(atom_id));
        sqlite3_bind_text(stmt, 2, tag.tag.c_str(), -1, SQLITE_STATIC);
        
        if (tag.bucket.has_value()) {
            sqlite3_bind_text(stmt, 3, tag.bucket.value().c_str(), -1, SQLITE_STATIC);
        } else {
            sqlite3_bind_null(stmt, 3);
        }
        
        if (sqlite3_step(stmt) != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            throw DatabaseError("Failed to insert tag");
        }
        
        sqlite3_finalize(stmt);
    }
}

std::vector<Tag> Database::getTagsForAtom(AtomId atom_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Tag> tags;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, atom_id, tag, bucket FROM tags WHERE atom_id = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_int(stmt, 1, static_cast<int>(atom_id));
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Tag tag;
        tag.id = sqlite3_column_int(stmt, 0);
        tag.atom_id = sqlite3_column_int(stmt, 1);
        tag.tag = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        
        if (sqlite3_column_type(stmt, 3) != SQLITE_NULL) {
            tag.bucket = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        }
        
        tags.push_back(tag);
    }
    
    sqlite3_finalize(stmt);
    return tags;
}

std::vector<Atom> Database::getAtomsByTag(const std::string& tag) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Atom> atoms;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT a.id, a.source_id, a.content, a.char_start, a.char_end, a.timestamp, a.simhash "
                      "FROM atoms a "
                      "JOIN tags t ON a.id = t.atom_id "
                      "WHERE t.tag = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_text(stmt, 1, tag.c_str(), -1, SQLITE_STATIC);
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Atom atom;
        atom.id = sqlite3_column_int(stmt, 0);
        atom.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        atom.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        atom.char_start = sqlite3_column_int(stmt, 3);
        atom.char_end = sqlite3_column_int(stmt, 4);
        atom.timestamp = sqlite3_column_double(stmt, 5);
        
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        atom.simhash = std::stoull(simhash_str, nullptr, 16);
        
        atoms.push_back(atom);
    }
    
    sqlite3_finalize(stmt);
    return atoms;
}

std::vector<std::string> Database::listAllTags() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<std::string> tags;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT DISTINCT tag FROM tags ORDER BY tag";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        tags.push_back(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
    }
    
    sqlite3_finalize(stmt);
    return tags;
}

// ==================== Molecule Operations ====================

void Database::insertMolecule(const Atom& molecule) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!molecule.compound_id.has_value() ||
        !molecule.start_byte.has_value() ||
        !molecule.end_byte.has_value()) {
        throw std::invalid_argument("Molecule must have compound_id, start_byte, and end_byte");
    }

    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO molecules (id, compound_id, content, start_byte, end_byte, timestamp, simhash) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    // Bind parameters
    // 1. id (TEXT) -> molecule.source_id
    sqlite3_bind_text(stmt, 1, molecule.source_id.c_str(), -1, SQLITE_STATIC);

    // 2. compound_id (TEXT) -> molecule.compound_id
    if (molecule.compound_id.has_value()) {
        sqlite3_bind_text(stmt, 2, molecule.compound_id.value().c_str(), -1, SQLITE_STATIC);
    } else {
        // Should not happen due to check above, but for safety
        sqlite3_finalize(stmt);
        throw std::invalid_argument("Molecule must have compound_id");
    }

    // 3. content (TEXT) -> molecule.content
    sqlite3_bind_text(stmt, 3, molecule.content.c_str(), -1, SQLITE_STATIC);

    // 4. start_byte (INTEGER) -> molecule.start_byte
    if (molecule.start_byte.has_value()) {
        sqlite3_bind_int(stmt, 4, static_cast<int>(molecule.start_byte.value()));
    } else {
        sqlite3_finalize(stmt);
        throw std::invalid_argument("Molecule must have start_byte");
    }

    // 5. end_byte (INTEGER) -> molecule.end_byte
    if (molecule.end_byte.has_value()) {
        sqlite3_bind_int(stmt, 5, static_cast<int>(molecule.end_byte.value()));
    } else {
        sqlite3_finalize(stmt);
        throw std::invalid_argument("Molecule must have end_byte");
    }

    // 6. timestamp (REAL) -> molecule.timestamp
    sqlite3_bind_double(stmt, 6, molecule.timestamp);

    // 7. simhash (TEXT) -> molecule.simhash (hex string)
    // Create hex string 0x...
    std::stringstream simhash_ss;
    simhash_ss << "0x" << std::hex << molecule.simhash;
    std::string simhash_hex = simhash_ss.str();
    sqlite3_bind_text(stmt, 7, simhash_hex.c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw DatabaseError("Failed to insert molecule");
    }
    
    sqlite3_finalize(stmt);
}

std::vector<Atom> Database::getMoleculesByCompound(const std::string& compound_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Atom> molecules;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, compound_id, content, start_byte, end_byte, timestamp, simhash "
                      "FROM molecules WHERE compound_id = ?";

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }

    sqlite3_bind_text(stmt, 1, compound_id.c_str(), -1, SQLITE_STATIC);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Atom molecule;
        // id -> source_id
        molecule.source_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));

        // compound_id
        molecule.compound_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));

        // content
        molecule.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));

        // start_byte
        molecule.start_byte = sqlite3_column_int(stmt, 3);

        // end_byte
        molecule.end_byte = sqlite3_column_int(stmt, 4);

        // timestamp
        molecule.timestamp = sqlite3_column_double(stmt, 5);

        // simhash (hex string to uint64_t)
        std::string simhash_str = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        try {
            molecule.simhash = std::stoull(simhash_str, nullptr, 16);
        } catch (...) {
            molecule.simhash = 0;
        }

        // Initialize other fields
        molecule.id = 0;
        molecule.char_start = 0;
        molecule.char_end = 0;

        molecules.push_back(molecule);
    }
    
    sqlite3_finalize(stmt);
    return molecules;
}

// ==================== Edge Operations ====================

void Database::insertEdge(const Edge& edge) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO edges (from_atom, to_atom, weight, edge_type) VALUES (?, ?, ?, ?)";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_int(stmt, 1, static_cast<int>(edge.from));
    sqlite3_bind_int(stmt, 2, static_cast<int>(edge.to));
    sqlite3_bind_double(stmt, 3, edge.weight);
    sqlite3_bind_text(stmt, 4, edge.edge_type.c_str(), -1, SQLITE_STATIC);
    
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        throw DatabaseError("Failed to insert edge");
    }
    
    sqlite3_finalize(stmt);
}

std::vector<Edge> Database::getEdgesFrom(AtomId atom_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Edge> edges;
    
    sqlite3_stmt* stmt;
    const char* sql = "SELECT from_atom, to_atom, weight, edge_type FROM edges WHERE from_atom = ?";
    
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        throw DatabaseError("Failed to prepare statement");
    }
    
    sqlite3_bind_int(stmt, 1, static_cast<int>(atom_id));
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Edge edge;
        edge.from = sqlite3_column_int(stmt, 0);
        edge.to = sqlite3_column_int(stmt, 1);
        edge.weight = sqlite3_column_double(stmt, 2);
        edge.edge_type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        
        edges.push_back(edge);
    }
    
    sqlite3_finalize(stmt);
    return edges;
}

} // namespace anchor
