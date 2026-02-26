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
#include <unordered_map>
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
    explicit Database(const std::string& path);
    static Database inMemory();
    ~Database();
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    Database(Database&&) noexcept;
    Database& operator=(Database&&) noexcept;
    DbStats getStats() const;
    void wipeAllData();
    bool isEmpty() const;
    void upsertSource(const Source& source);
    Source getSource(const SourceId& id) const;
    std::vector<Source> listSources() const;
    void deleteSource(const SourceId& id);
    AtomId insertAtom(const Atom& atom);
    std::vector<AtomId> insertAtomsBatch(const std::vector<Atom>& atoms);
    Atom getAtom(AtomId id) const;
    Atom getAtomTimestampAndSimhash(AtomId id) const;
    std::vector<Atom> getAtomsTimestampAndSimhashBatch(const std::vector<AtomId>& ids) const;
    std::vector<Atom> getAtomsBySource(const SourceId& source_id) const;
    std::vector<Atom> searchAtoms(const std::string& query, size_t limit = 100) const;
    std::vector<Atom> getAllAtoms() const;
    
    void beginTransaction();
    void commitTransaction();
    
    void deleteAtom(AtomId id);
    void addTags(AtomId atom_id, const std::vector<Tag>& tags);
    std::vector<Tag> getTagsForAtom(AtomId atom_id) const;
    std::vector<Atom> getAtomsByTag(const std::string& tag) const;
    std::vector<std::string> listAllTags() const;
    void insertMolecule(const Atom& molecule);
    std::vector<Atom> getMoleculesByCompound(const std::string& compound_id) const;
    void insertEdge(const Edge& edge);
    std::vector<Edge> getEdgesFrom(AtomId atom_id) const;
    std::vector<Edge> getEdgesFromBatch(const std::vector<AtomId>& atom_ids) const;
    std::vector<Neighbor> getNeighbors(AtomId atom_id) const;
    void rebuildFtsIndex();
    private:
    sqlite3* db_;
    mutable std::unordered_map<std::string, sqlite3_stmt*> prepared_statements_;
    sqlite3_stmt* getPreparedStatement(const std::string& sql) const;
    void finalizePreparedStatements();
    mutable std::mutex mutex_;
    void open(const std::string& path);
    void close();
    void migrate();
    void enableForeignKeys();
    void enableWALMode();
    AtomId insertAtomNoLock(const Atom& atom);  // helper: caller must hold mutex_
    class StatementGuard {
        sqlite3_stmt* stmt_;
    public:
        explicit StatementGuard(sqlite3_stmt* stmt) : stmt_(stmt) {}
        ~StatementGuard() { /* cached */ }
        sqlite3_stmt* get() const { return stmt_; }
    };
};

} // namespace anchor

#endif // ANCHOR_CORE_DATABASE_H
