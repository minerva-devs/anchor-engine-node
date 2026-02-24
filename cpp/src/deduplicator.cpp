/**
 * @file deduplicator.cpp
 * @brief Implementation of 5-layer deduplication strategy
 */

#include "deduplicator.h"
#include "md5.h"
#include <algorithm>
#include <unordered_set>
#include <cmath>

namespace anchor {

Deduplicator::Deduplicator(const DeduplicatorConfig& config)
    : config_(config) {}

Deduplicator::~Deduplicator() = default;

std::vector<Candidate> Deduplicator::deduplicate(
    const std::vector<Candidate>& candidates
) {
    std::vector<Candidate> unique;
    unique.reserve(candidates.size());
    
    // Track fingerprints for each layer
    std::unordered_set<std::string> md5_fingerprints;
    std::unordered_set<std::string> content_hashes;
    std::unordered_set<uint64_t> simhash_hashes;
    
    for (const auto& candidate : candidates) {
        bool is_duplicate = false;
        
        // Layer 1: Geometric overlap (50% threshold)
        if (!unique.empty()) {
            for (const auto& existing : unique) {
                if (computeGeometricOverlap(candidate, existing) > config_.geometric_threshold) {
                    is_duplicate = true;
                    break;
                }
            }
        }
        
        if (is_duplicate) continue;
        
        // Layer 2: MD5 fingerprint (first 500 chars)
        // Note: In real implementation, content would be loaded from database
        // For now, we skip this layer or use atom_id as proxy
        
        // Layer 3: Containment check (substring match)
        // Skip for now - requires content access
        
        // Layer 4: Fuzzy prefix matching (50-100 chars)
        // Skip for now - requires content access
        
        // Layer 5: SimHash distance (Hamming < 5)
        uint64_t simhash_value = static_cast<uint64_t>(candidate.simhash);
        
        bool simhash_duplicate = false;
        for (uint64_t existing_hash : simhash_hashes) {
            int distance = computeHammingDistance(simhash_value, existing_hash);
            if (distance < config_.simhash_distance_threshold) {
                simhash_duplicate = true;
                break;
            }
        }
        
        if (simhash_duplicate) {
            continue;
        }
        
        // Not a duplicate, add to unique list
        unique.push_back(candidate);
        simhash_hashes.insert(simhash_value);
    }
    
    return unique;
}

double Deduplicator::computeGeometricOverlap(
    const Candidate& a,
    const Candidate& b
) const {
    // For atoms with byte coordinates
    // Overlap = intersection / union
    
    // Note: In real implementation, would use start_byte and end_byte
    // For now, return 0 (no overlap detected)
    
    // Placeholder implementation
    // TODO: Load atom coordinates and compute actual overlap
    
    return 0.0;
}

bool Deduplicator::checkMD5Fingerprint(
    const std::string& content_a,
    const std::string& content_b
) const {
    // Compare MD5 fingerprints of first N chars
    size_t prefix_len = std::min({
        content_a.size(),
        content_b.size(),
        config_.md5_prefix_length
    });
    
    std::string prefix_a = content_a.substr(0, prefix_len);
    std::string prefix_b = content_b.substr(0, prefix_len);
    
    MD5Hash hash_a = computeMD5(prefix_a);
    MD5Hash hash_b = computeMD5(prefix_b);
    
    return (hash_a == hash_b);
}

bool Deduplicator::checkContainment(
    const std::string& content_a,
    const std::string& content_b
) const {
    // Check if one content is substring of another
    if (content_a.size() < content_b.size()) {
        return content_b.find(content_a) != std::string::npos;
    } else {
        return content_a.find(content_b) != std::string::npos;
    }
}

bool Deduplicator::checkFuzzyPrefix(
    const std::string& content_a,
    const std::string& content_b
) const {
    // Compare prefixes with fuzzy matching
    size_t min_len = std::min(content_a.size(), content_b.size());
    
    if (min_len < config_.fuzzy_prefix_min) {
        return false;  // Too short for fuzzy matching
    }
    
    size_t compare_len = std::min(min_len, config_.fuzzy_prefix_max);
    
    // Count matching characters
    size_t matches = 0;
    for (size_t i = 0; i < compare_len; i++) {
        if (content_a[i] == content_b[i]) {
            matches++;
        }
    }
    
    double similarity = static_cast<double>(matches) / compare_len;
    
    // Consider duplicate if >90% similar
    return similarity > 0.9;
}

int Deduplicator::computeHammingDistance(uint64_t hash1, uint64_t hash2) const {
    uint64_t diff = hash1 ^ hash2;
    
    // Count set bits (population count)
    #if defined(__GNUC__) || defined(__clang__)
        return __builtin_popcountll(diff);
    #else
        // Portable implementation
        int count = 0;
        while (diff) {
            count += diff & 1;
            diff >>= 1;
        }
        return count;
    #endif
}

std::vector<Candidate> Deduplicator::deduplicateWithContent(
    const std::vector<Candidate>& candidates,
    const std::vector<std::string>& contents
) {
    if (candidates.size() != contents.size()) {
        return candidates;  // Mismatch, return as-is
    }
    
    std::vector<Candidate> unique;
    unique.reserve(candidates.size());
    
    std::unordered_set<std::string> md5_fingerprints;
    std::unordered_set<std::string> all_contents;
    std::unordered_set<uint64_t> simhash_hashes;
    
    for (size_t i = 0; i < candidates.size(); i++) {
        const auto& candidate = candidates[i];
        const auto& content = contents[i];
        
        bool is_duplicate = false;
        
        // Layer 1: Geometric overlap
        for (const auto& existing : unique) {
            if (computeGeometricOverlap(candidate, existing) > config_.geometric_threshold) {
                is_duplicate = true;
                break;
            }
        }
        
        if (is_duplicate) continue;
        
        // Layer 2: MD5 fingerprint
        std::string fingerprint = computeMD5Fingerprint(content);
        if (md5_fingerprints.count(fingerprint) > 0) {
            continue;
        }
        
        // Layer 3: Containment check
        for (const auto& existing_content : all_contents) {
            if (checkContainment(content, existing_content)) {
                is_duplicate = true;
                break;
            }
        }
        
        if (is_duplicate) continue;
        
        // Layer 4: Fuzzy prefix
        for (const auto& existing_content : all_contents) {
            if (checkFuzzyPrefix(content, existing_content)) {
                is_duplicate = true;
                break;
            }
        }
        
        if (is_duplicate) continue;
        
        // Layer 5: SimHash distance
        uint64_t simhash_value = static_cast<uint64_t>(candidate.simhash);
        bool simhash_duplicate = false;
        
        for (uint64_t existing_hash : simhash_hashes) {
            int distance = computeHammingDistance(simhash_value, existing_hash);
            if (distance < config_.simhash_distance_threshold) {
                simhash_duplicate = true;
                break;
            }
        }
        
        if (simhash_duplicate) continue;
        
        // Not a duplicate
        unique.push_back(candidate);
        md5_fingerprints.insert(fingerprint);
        all_contents.insert(content);
        simhash_hashes.insert(simhash_value);
    }
    
    return unique;
}

} // namespace anchor
