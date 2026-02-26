/**
 * @file physics_walker.cpp
 * @brief Implementation of physics-based graph traversal
 */

#include "physics_walker.h"
#include <algorithm>
#include <cmath>
#include <unordered_set>
#include <queue>

namespace anchor {

PhysicsWalker::PhysicsWalker(const PhysicsWalkerConfig& config)
    : config_(config) {}

PhysicsWalker::~PhysicsWalker() = default;

std::vector<Candidate> PhysicsWalker::performRadialInflation(
    Database& db,
    const std::vector<AtomId>& anchor_ids,
    size_t limit,
    double threshold
) {
    // Step 1: Load anchor atoms into memory
    std::vector<Atom> anchors;
    anchors.reserve(anchor_ids.size());
    
    for (AtomId id : anchor_ids) {
        try {
            anchors.push_back(db.getAtom(id));
        } catch (const DatabaseError& e) {
            // Skip missing anchors
            continue;
        }
    }
    
    if (anchors.empty()) {
        return {};
    }
    
    // Step 2: Graph traversal in C++ (no SQL overhead)
    std::vector<Candidate> candidates;
    
    for (const auto& anchor : anchors) {
        traverseGraph(db, anchor, config_.walk_radius, candidates);
    }
    
    // Step 3: Apply Unified Field Equation to all candidates
    for (auto& candidate : candidates) {
        candidate.gravity_score = computeGravityScore(candidate, anchors);
    }
    
    // Step 4: Filter by threshold
    std::vector<Candidate> filtered;
    filtered.reserve(candidates.size());
    
    std::copy_if(candidates.begin(), candidates.end(), 
                 std::back_inserter(filtered),
                 [threshold](const Candidate& c) {
                     return c.gravity_score > threshold;
                 });
    
    // Step 5: Sort by gravity score and return top K
    std::sort(filtered.begin(), filtered.end(),
              [](const Candidate& a, const Candidate& b) {
                  return a.gravity_score > b.gravity_score;
              });
    
    if (filtered.size() > limit) {
        filtered.resize(limit);
    }
    
    return filtered;
}

std::vector<Candidate> PhysicsWalker::getConnectedNodes(
    Database& db,
    const std::vector<AtomId>& anchor_ids,
    size_t limit,
    double threshold
) {
    return performRadialInflation(db, anchor_ids, limit, threshold);
}

double PhysicsWalker::computeGravityScore(const Candidate& candidate, 
                                          const std::vector<Atom>& anchors) {
    double max_score = 0.0;
    
    for (const auto& anchor : anchors) {
        // 1. Semantic Gravity: shared tags with hop damping
        int shared_tags = candidate.shared_tags;
        double semantic = applyHopDamping(
            static_cast<double>(shared_tags) / 10.0,  // Normalize
            candidate.hop_distance
        );
        
        // 2. Temporal Decay
        double temporal = applyTemporalDecay(
            1.0,  // Base
            candidate.timestamp,
            anchor.timestamp
        );
        
        // 3. Structural Gravity (SimHash similarity)
        double structural = computeSimHashSimilarity(
            candidate.simhash,
            anchor.simhash
        );
        
        // 4. Unified Field Equation (multiplicative)
        double score = semantic * temporal * structural;
        
        // 5. Add physical bonus if applicable
        score += candidate.physical_bonus * 0.1;
        
        // 6. Clamp to [0, 1]
        score = std::max(0.0, std::min(1.0, score));
        
        max_score = std::max(max_score, score);
    }
    
    return max_score;
}

void PhysicsWalker::traverseGraph(Database& db, 
                                  const Atom& start_anchor, 
                                  int max_hops,
                                  std::vector<Candidate>& candidates) {
    // BFS with hop tracking
    std::queue<std::pair<AtomId, int>> queue;  // (atom_id, hop_distance)
    std::unordered_set<AtomId> visited;
    
    queue.push({start_anchor.id, 0});
    visited.insert(start_anchor.id);
    
    while (!queue.empty()) {
        auto [current_id, hop] = queue.front();
        queue.pop();
        
        if (hop >= max_hops) {
            continue;
        }
        
        // Get edges from current atom
        auto edges = db.getEdgesFrom(current_id);
        
        for (const auto& edge : edges) {
            if (visited.find(edge.to) == visited.end()) {
                visited.insert(edge.to);
                queue.push({edge.to, hop + 1});
                
                // Create candidate
                Candidate candidate;
                candidate.atom_id = edge.to;
                candidate.hop_distance = hop + 1;
                candidate.shared_tags = 1;  // At least one shared tag
                candidate.physical_bonus = 0.0;
                candidate.gravity_score = 0.0;
                
                // Load only necessary atom data (timestamp and simhash)
                try {
                    auto atom = db.getAtomTimestampAndSimhash(edge.to);
                    candidate.timestamp = atom.timestamp;
                    candidate.simhash = atom.simhash;
                } catch (...) {
                    continue;
                }
                
                candidates.push_back(candidate);
            }
        }
    }
}

} // namespace anchor
