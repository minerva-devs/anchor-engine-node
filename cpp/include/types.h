/**
 * @file types.h
 * @brief Common type definitions for Anchor Core
 */

#ifndef ANCHOR_CORE_TYPES_H
#define ANCHOR_CORE_TYPES_H

#include "common.h"

namespace anchor {

/**
 * @brief 64-bit SimHash fingerprint
 */
using SimHash = uint64_t;

/**
 * @brief Timestamp type (Unix epoch in seconds)
 */
using Timestamp = double;

/**
 * @brief Unique identifier for atoms
 */
using AtomId = uint64_t;

/**
 * @brief Unique identifier for sources
 */
using SourceId = std::string;

/**
 * @brief Represents a single atom (knowledge unit)
 */
struct Atom {
    AtomId id;
    SourceId source_id;
    std::string content;
    size_t char_start;
    size_t char_end;
    Timestamp timestamp;
    SimHash simhash;
    std::vector<std::string> tags;
    std::optional<std::string> metadata;

    // For context inflation
    std::optional<std::string> compound_id;
    std::optional<size_t> start_byte;
    std::optional<size_t> end_byte;
};

/**
 * @brief Represents a tag associated with an atom
 */
struct Tag {
    uint64_t id;
    AtomId atom_id;
    std::string tag;
    std::optional<std::string> bucket;
};

/**
 * @brief Represents a source document
 */
struct Source {
    SourceId id;
    std::string path;
    std::optional<std::string> bucket;
    Timestamp created_at;
    Timestamp updated_at;
    std::optional<std::string> metadata;  // JSON as string for now
};

/**
 * @brief Graph edge for traversal
 */
struct Edge {
    AtomId from;
    AtomId to;
    double weight;
    std::string edge_type;  // "tag", "temporal", "simhash"
};

/**
 * @brief Candidate result from physics walk
 */
struct Candidate {
    AtomId atom_id;
    int hop_distance;
    int shared_tags;
    double physical_bonus;
    Timestamp timestamp;
    SimHash simhash;
    double gravity_score;
    
    // For deduplication tracking
    std::vector<std::string> content_fingerprints;
};

/**
 * @brief Physics metadata for graph context protocol
 */
struct PhysicsMetadata {
    double gravity_score;
    std::string time_drift;
    bool is_recurring;
    int frequency;
    std::string connection_type;  // "direct_hit", "tag_walk", "temporal", "simhash"
    std::string source_anchor_id;
    std::string link_reason;
    int hop_distance;
};

/**
 * @brief Search result with content
 */
struct SearchResult {
    Atom atom;
    double score;
    std::string provenance;
    PhysicsMetadata physics;
};

/**
 * @brief Database statistics
 */
struct DbStats {
    size_t atom_count;
    size_t source_count;
    size_t tag_count;
};

/**
 * @brief Configuration for physics walker
 */
struct PhysicsWalkerConfig {
    double damping_factor = 0.85;       // γ (gamma)
    double temporal_decay = 0.0001;     // λ (lambda) per second
    int max_per_hop = 50;
    int walk_radius = 1;
    double gravity_threshold = 0.01;
    double temperature = 0.2;
};

/**
 * @brief Configuration for context inflation
 */
struct ContextInflatorConfig {
    size_t base_radius = 205;  // Base character radius
    size_t max_chars = 65536;  // Maximum characters per atom
    bool expand_to_paragraphs = true;
};

/**
 * @brief Configuration for deduplication
 */
struct DeduplicatorConfig {
    double geometric_threshold = 0.5;    // 50% overlap
    size_t md5_prefix_length = 500;      // First 500 chars for MD5
    double fuzzy_prefix_min = 50;        // Min 50 chars for fuzzy
    double fuzzy_prefix_max = 100;       // Max 100 chars for fuzzy
    int simhash_distance_threshold = 5;  // Hamming distance < 5
};

/**
 * @brief Configuration for transient filter
 */
struct TransientFilterConfig {
    std::vector<std::string> patterns = {
        "Traceback", "KeyError", "npm install", 
        "pip install", "Build succeeded"
    };
    size_t min_content_length = 100;
};

} // namespace anchor

#endif // ANCHOR_CORE_TYPES_H
