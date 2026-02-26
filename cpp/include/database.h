/**
 * @file database.h
 * @brief SQLite database wrapper for Anchor Core
 */

#ifndef ANCHOR_CORE_DATABASE_H
#define ANCHOR_CORE_DATABASE_H

#include "types.h"
#include <sqlite3.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>

namespace anchor {

/**
 * @brief Database exception
 */
class DatabaseError : public std::runtime_error {
public:
    explicit DatabaseError(const std::string& msg) 
        : std::runtime_error(msg) {}
};

/**
 * @brief SQLite database wrapper
 * 
 * Provides CRUD operations for atoms, sources, tags with FTS5 support.
 * Uses WAL mode for concurrent reads.
 */
class Database {
public:
    /**
     * @brief Open or create database at path
     * @param path Database file path
     */
    explicit Database(const std::string& path);
    
    /**
     * @brief Create in-memory database (for testing)
     */
    static Database inMemory();
    
    /**
     * @brief Close database connection
     */
    ~Database();
    
    // Prevent copying
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    
    // Allow moving
    Database(Database&&) noexcept;
    Database& operator=(Database&&) noexcept;
    
    /**
     * @brief Get database statistics
     * @return DbStats Statistics
     */
    DbStats getStats() const;
    
    /**
     * @brief Wipe all data (disposable index pattern)
     */
    void wipeAllData();
    
    /**
     * @brief Check if database is empty
     * @return true if no atoms exist
     */
    bool isEmpty() const;
    
    // ==================== Source Operations ====================
    
    void upsertSource(const Source& source);
    Source getSource(const SourceId& id) const;
    std::vector<Source> listSources() const;
    void deleteSource(const SourceId& id);
    
    // ==================== Atom Operations ====================
    
    AtomId insertAtom(const Atom& atom);
    std::vector<AtomId> insertAtomsBatch(const std::vector<Atom>& atoms);
    Atom getAtom(AtomId id) const;
    std::vector<Atom> getAtomsBySource(const SourceId& source_id) const;
    std::vector<Atom> searchAtoms(const std::string& query, size_t limit = 100) const;
    std::vector<Atom> getAllAtoms() const;
    void deleteAtom(AtomId id);
    
    // ==================== Tag Operations ====================
    
    void addTags(AtomId atom_id, const std::vector<Tag>& tags);
    std::vector<Tag> getTagsForAtom(AtomId atom_id) const;
    std::vector<Atom> getAtomsByTag(const std::string& tag) const;
    std::vector<std::string> listAllTags() const;
    
    // ==================== Molecule Operations ====================
    
    void insertMolecule(const Atom& molecule);
    std::vector<Atom> getMoleculesByCompound(const std::string& compound_id) const;
    
    // ==================== Edge Operations ====================
    
    void insertEdge(const Edge& edge);
    std::vector<Edge> getEdgesFrom(AtomId atom_id) const;
    std::vector<Neighbor> getNeighbors(AtomId atom_id) const;
    
    // ==================== FTS Operations ====================
    
    void rebuildFtsIndex();
    
private:
    sqlite3* db_;
    mutable std::mutex mutex_;
    
    void open(const std::string& path);
    void close();
    void migrate();
    void enableForeignKeys();
    void enableWALMode();
    
    // Helper for prepared statements
    class StatementGuard {
        sqlite3_stmt* stmt_;
    public:
        explicit StatementGuard(sqlite3_stmt* stmt) : stmt_(stmt) {}
        ~StatementGuard() { sqlite3_finalize(stmt_); }
        sqlite3_stmt* get() const { return stmt_; }
    };
};

} // namespace anchor

#endif // ANCHOR_CORE_DATABASE_H
