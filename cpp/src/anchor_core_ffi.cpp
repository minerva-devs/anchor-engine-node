/**
 * @file anchor_core_ffi.cpp
 * @brief FFI wrapper for Anchor Core C++ library
 * 
 * Provides C-style exports for ffi-napi integration with Node.js
 */

#include "database.h"
#include "physics_walker.h"
#include "context_inflator.h"
#include "deduplicator.h"
#include "transient_filter.h"
#include "simhash.h"
#include <nlohmann/json.hpp>
#include <string>
#include <vector>

using json = nlohmann::json;

#if defined(_WIN32)
  #define ANCHOR_EXPORT __declspec(dllexport)
#else
  #define ANCHOR_EXPORT __attribute__((visibility("default")))
#endif

// ==================== Database FFI ====================

extern "C" {

/**
 * Create a new database instance
 * @param path Database path (or ":memory:" for in-memory)
 * @return Opaque pointer to database
 */
ANCHOR_EXPORT void* database_create(const char* path) {
    try {
        const char* dbPath = path ? path : ":memory:";
        printf("[anchor_core_ffi] Creating database at: %s\n", dbPath);
        fflush(stdout);
        auto* db = new anchor::Database(dbPath);
        printf("[anchor_core_ffi] Database created successfully: %p\n", db);
        fflush(stdout);
        return db;
    } catch (const std::exception& e) {
        printf("[anchor_core_ffi] Database creation failed: %s\n", e.what());
        fflush(stdout);
        return nullptr;
    } catch (...) {
        printf("[anchor_core_ffi] Database creation failed: unknown exception\n");
        fflush(stdout);
        return nullptr;
    }
}

/**
 * Destroy database instance
 * @param db Database pointer
 */
ANCHOR_EXPORT void database_destroy(void* db) {
    if (db) {
        delete static_cast<anchor::Database*>(db);
    }
}

/**
 * Open database
 * @param db Database pointer
 * @param path Database path
 * @return true on success
 */
ANCHOR_EXPORT bool database_open(void* db, const char* path) {
    // Database is already opened in constructor
    // This function is a no-op for FFI compatibility
    return db != nullptr;
}

/**
 * Close database
 * @param db Database pointer
 */
ANCHOR_EXPORT void database_close(void* db) {
    // Database will be closed in destructor
    // This function is a no-op for FFI compatibility
}

/**
 * Search atoms with FTS5
 * @param db Database pointer
 * @param query Search query
 * @param limit Maximum results
 * @return JSON string of results
 */
ANCHOR_EXPORT const char* database_search_atoms(void* db, const char* query, long long limit) {
    try {
        auto* database = static_cast<anchor::Database*>(db);
        auto atoms = database->searchAtoms(query, static_cast<size_t>(limit));
        
        json j = json::array();
        for (const auto& atom : atoms) {
            j.push_back({
                {"id", atom.id},
                {"source_id", atom.source_id},
                {"content", atom.content},
                {"char_start", atom.char_start},
                {"char_end", atom.char_end},
                {"timestamp", atom.timestamp},
                {"simhash", atom.simhash}
            });
        }
        
        static std::string result = j.dump();
        return result.c_str();
    } catch (...) {
        static std::string empty = "[]";
        return empty.c_str();
    }
}

/**
 * Get database statistics
 * @param db Database pointer
 * @return JSON string of stats
 */
ANCHOR_EXPORT const char* database_get_stats(void* db) {
    try {
        auto* database = static_cast<anchor::Database*>(db);
        auto stats = database->getStats();
        
        json j = {
            {"atom_count", stats.atom_count},
            {"source_count", stats.source_count},
            {"tag_count", stats.tag_count}
        };
        
        static std::string result = j.dump();
        return result.c_str();
    } catch (...) {
        static std::string empty = "{}";
        return empty.c_str();
    }
}

/**
 * Insert an atom
 * @param db Database pointer
 * @param source_id Source ID
 * @param content Content
 * @param char_start Start character offset
 * @param char_end End character offset
 * @param timestamp Timestamp
 * @param simhash SimHash value
 * @return Atom ID
 */
ANCHOR_EXPORT long long database_insert_atom(
    void* db,
    const char* source_id,
    const char* content,
    long long char_start,
    long long char_end,
    double timestamp,
    unsigned long long simhash
) {
    try {
        auto* database = static_cast<anchor::Database*>(db);
        
        anchor::Atom atom;
        atom.source_id = source_id ? source_id : "";
        atom.content = content ? content : "";
        atom.char_start = static_cast<size_t>(char_start);
        atom.char_end = static_cast<size_t>(char_end);
        atom.timestamp = timestamp;
        atom.simhash = static_cast<uint64_t>(simhash);
        
        return static_cast<long long>(database->insertAtom(atom));
    } catch (...) {
        return -1;
    }
}

// ==================== Physics Walker FFI ====================

/**
 * Create physics walker
 * @param damping Damping factor
 * @param temporal_decay Temporal decay rate
 * @param walk_radius Walk radius (hops)
 * @return Opaque pointer
 */
ANCHOR_EXPORT void* physics_walker_create(double damping, double temporal_decay, long long walk_radius) {
    try {
        anchor::PhysicsWalkerConfig config;
        config.damping_factor = damping;
        config.temporal_decay = temporal_decay;
        config.walk_radius = static_cast<size_t>(walk_radius);
        return new anchor::PhysicsWalker(config);
    } catch (...) {
        return nullptr;
    }
}

/**
 * Destroy physics walker
 * @param walker Walker pointer
 */
ANCHOR_EXPORT void physics_walker_destroy(void* walker) {
    if (walker) {
        delete static_cast<anchor::PhysicsWalker*>(walker);
    }
}

/**
 * Perform radial inflation
 * @param walker Walker pointer
 * @param db Database pointer
 * @param anchor_ids_json JSON array of anchor IDs
 * @param limit Maximum results
 * @param threshold Gravity threshold
 * @return JSON array of candidates
 */
ANCHOR_EXPORT const char* physics_walker_radial_inflation(
    void* walker,
    void* db,
    const char* anchor_ids_json,
    long long limit,
    double threshold
) {
    try {
        auto* w = static_cast<anchor::PhysicsWalker*>(walker);
        auto* database = static_cast<anchor::Database*>(db);
        
        json j_ids = json::parse(anchor_ids_json);
        std::vector<anchor::AtomId> anchor_ids;
        for (const auto& id : j_ids) {
            anchor_ids.push_back(id.get<anchor::AtomId>());
        }
        
        // TODO: Implement actual radial inflation
        // For now, return empty array
        static std::string empty = "[]";
        return empty.c_str();
    } catch (...) {
        static std::string empty = "[]";
        return empty.c_str();
    }
}

// ==================== Context Inflator FFI ====================

/**
 * Create context inflator
 * @param base_radius Base expansion radius
 * @param expand_to_paragraphs Expand to paragraph boundaries
 * @return Opaque pointer
 */
ANCHOR_EXPORT void* context_inflator_create(long long base_radius, bool expand_to_paragraphs) {
    try {
        anchor::ContextInflatorConfig config;
        config.base_radius = static_cast<size_t>(base_radius);
        config.expand_to_paragraphs = expand_to_paragraphs;
        return new anchor::ContextInflator(config);
    } catch (...) {
        return nullptr;
    }
}

/**
 * Destroy context inflator
 * @param inflator Inflator pointer
 */
ANCHOR_EXPORT void context_inflator_destroy(void* inflator) {
    if (inflator) {
        delete static_cast<anchor::ContextInflator*>(inflator);
    }
}

/**
 * Inflate context for atoms
 * @param inflator Inflator pointer
 * @param db Database pointer
 * @param atom_ids_json JSON array of atom IDs
 * @param max_chars Maximum characters
 * @return JSON array of inflated atoms
 */
ANCHOR_EXPORT const char* context_inflator_inflate(
    void* inflator,
    void* db,
    const char* atom_ids_json,
    long long max_chars
) {
    try {
        auto* i = static_cast<anchor::ContextInflator*>(inflator);
        auto* database = static_cast<anchor::Database*>(db);
        
        json j_ids = json::parse(atom_ids_json);
        std::vector<anchor::AtomId> atom_ids;
        for (const auto& id : j_ids) {
            atom_ids.push_back(id.get<anchor::AtomId>());
        }
        
        auto atoms = i->inflate(*database, atom_ids, static_cast<size_t>(max_chars));
        
        json j = json::array();
        for (const auto& atom : atoms) {
            j.push_back({
                {"id", atom.id},
                {"content", atom.content},
                {"char_start", atom.char_start},
                {"char_end", atom.char_end}
            });
        }
        
        static std::string result = j.dump();
        return result.c_str();
    } catch (...) {
        static std::string empty = "[]";
        return empty.c_str();
    }
}

// ==================== Deduplicator FFI ====================

/**
 * Create deduplicator
 * @param geometric_threshold Geometric overlap threshold
 * @param simhash_threshold SimHash distance threshold
 * @return Opaque pointer
 */
ANCHOR_EXPORT void* deduplicator_create(double geometric_threshold, long long simhash_threshold) {
    try {
        anchor::DeduplicatorConfig config;
        config.geometric_threshold = geometric_threshold;
        config.simhash_distance_threshold = static_cast<size_t>(simhash_threshold);
        return new anchor::Deduplicator(config);
    } catch (...) {
        return nullptr;
    }
}

/**
 * Destroy deduplicator
 * @param dedup Deduplicator pointer
 */
ANCHOR_EXPORT void deduplicator_destroy(void* dedup) {
    if (dedup) {
        delete static_cast<anchor::Deduplicator*>(dedup);
    }
}

/**
 * Deduplicate candidates
 * @param dedup Deduplicator pointer
 * @param candidates_json JSON array of candidates
 * @return JSON array of unique candidates
 */
ANCHOR_EXPORT const char* deduplicator_deduplicate(void* dedup, const char* candidates_json) {
    try {
        auto* d = static_cast<anchor::Deduplicator*>(dedup);
        json j_candidates = json::parse(candidates_json);
        
        // TODO: Convert JSON to Candidate objects and deduplicate
        // For now, return input
        static std::string result = j_candidates.dump();
        return result.c_str();
    } catch (...) {
        static std::string empty = "[]";
        return empty.c_str();
    }
}

// ==================== Transient Filter FFI ====================

/**
 * Create transient filter
 * @param min_content_length Minimum content length
 * @return Opaque pointer
 */
ANCHOR_EXPORT void* transient_filter_create(long long min_content_length) {
    try {
        anchor::TransientFilterConfig config;
        config.min_content_length = static_cast<size_t>(min_content_length);
        return new anchor::TransientFilter(config);
    } catch (...) {
        return nullptr;
    }
}

/**
 * Destroy transient filter
 * @param filter Filter pointer
 */
ANCHOR_EXPORT void transient_filter_destroy(void* filter) {
    if (filter) {
        delete static_cast<anchor::TransientFilter*>(filter);
    }
}

/**
 * Apply transient filter
 * @param filter Filter pointer
 * @param atoms_json JSON array of atoms
 * @return JSON array of filtered atoms
 */
ANCHOR_EXPORT const char* transient_filter_apply(void* filter, const char* atoms_json) {
    try {
        auto* f = static_cast<anchor::TransientFilter*>(filter);
        json j_atoms = json::parse(atoms_json);
        
        // TODO: Convert JSON to Atom objects and filter
        // For now, return input
        static std::string result = j_atoms.dump();
        return result.c_str();
    } catch (...) {
        static std::string empty = "[]";
        return empty.c_str();
    }
}

// ==================== SimHash FFI ====================

/**
 * Compute SimHash for text
 * @param text Input text
 * @return SimHash 64-bit fingerprint
 */
ANCHOR_EXPORT unsigned long long simhash_compute(const char* text) {
    try {
        if (!text) return 0;
        return static_cast<unsigned long long>(anchor::computeSimHash(text));
    } catch (...) {
        return 0;
    }
}

} // extern "C"
