/**
 * @file physics_walker.h
 * @brief Physics-based graph traversal for associative retrieval
 * 
 * Implements the STAR (Semantic Temporal Associative Retrieval) algorithm
 * using the Unified Field Equation:
 * 
 * W(q,a) = |T(q) ∩ T(a)| · γ^(d(q,a)) × e^(-λΔt) × (1 - H(h_q,h_a)/64)
 */

#ifndef ANCHOR_CORE_PHYSICS_WALKER_H
#define ANCHOR_CORE_PHYSICS_WALKER_H

#include "types.h"
#include "database.h"
#include <vector>
#include <memory>

namespace anchor {

/**
 * @brief Physics-based tag walker for graph traversal
 * 
 * This class implements the mathematical approach to graph traversal
 * using sparse matrix operations and the Unified Field Equation.
 */
class PhysicsWalker {
public:
    /**
     * @brief Construct a new Physics Walker
     * @param config Configuration parameters
     */
    explicit PhysicsWalker(const PhysicsWalkerConfig& config = PhysicsWalkerConfig());
    
    /**
     * @brief Destroy the Physics Walker
     */
    ~PhysicsWalker();
    
    /**
     * @brief Perform radial inflation from anchor atoms
     * 
     * @param db Database connection
     * @param anchor_ids List of anchor atom IDs to start from
     * @param limit Maximum number of results to return
     * @param threshold Minimum gravity score threshold
     * @return std::vector<Candidate> Ranked candidates by gravity score
     */
    std::vector<Candidate> performRadialInflation(
        Database& db,
        const std::vector<AtomId>& anchor_ids,
        size_t limit = 150,
        double threshold = 0.005
    );
    
    /**
     * @brief Get connected nodes via shared tags
     * 
     * @param db Database connection
     * @param anchor_ids Anchor atom IDs
     * @param limit Maximum results
     * @param threshold Gravity threshold
     * @return std::vector<Candidate> Connected nodes
     */
    std::vector<Candidate> getConnectedNodes(
        Database& db,
        const std::vector<AtomId>& anchor_ids,
        size_t limit = 50,
        double threshold = 0.1
    );

private:
    PhysicsWalkerConfig config_;
    
    /**
     * @brief Compute gravity score using Unified Field Equation
     * 
     * @param candidate Candidate atom
     * @param anchors Anchor atoms
     * @return double Gravity score (0.0 - 1.0)
     */
    double computeGravityScore(const Candidate& candidate, 
                               const std::vector<Atom>& anchors);
    
    /**
     * @brief Traverse graph with hop distance tracking
     * 
     * @param db Database connection
     * @param start_anchor Starting anchor atom
     * @param max_hops Maximum hop distance
     * @param candidates Output vector of candidates
     */
    void traverseGraph(Database& db, 
                      const Atom& start_anchor, 
                      int max_hops,
                      std::vector<Candidate>& candidates);
    
    /**
     * @brief Apply hop distance damping
     * 
     * @param base_score Base score without damping
     * @param hop_distance Graph hop distance (0-3)
     * @return double Damped score
     */
    inline double applyHopDamping(double base_score, int hop_distance) const {
        // Clamp hop distance to [0, 3] to prevent underflow
        int clamped_hop = std::max(0, std::min(3, hop_distance));
        return base_score * std::pow(config_.damping_factor, clamped_hop);
    }
    
    /**
     * @brief Apply temporal decay
     * 
     * @param base_score Base score without decay
     * @param timestamp Candidate timestamp
     * @param anchor_ts Anchor timestamp
     * @return double Decayed score
     */
    inline double applyTemporalDecay(double base_score, 
                                     Timestamp timestamp, 
                                     Timestamp anchor_ts) const {
        double delta_t = std::abs(timestamp - anchor_ts);
        return base_score * std::exp(-config_.temporal_decay * delta_t);
    }
    
    /**
     * @brief Compute SimHash similarity
     * 
     * @param hash1 First SimHash
     * @param hash2 Second SimHash
     * @return double Similarity score (0.0 - 1.0)
     */
    inline double computeSimHashSimilarity(SimHash hash1, SimHash hash2) const {
        // Count differing bits (Hamming distance)
        SimHash diff = hash1 ^ hash2;
        int hamming_distance = __builtin_popcountll(diff);
        
        // Normalize to [0, 1] where 1 = identical
        return 1.0 - (static_cast<double>(hamming_distance) / 64.0);
    }
};

} // namespace anchor

#endif // ANCHOR_CORE_PHYSICS_WALKER_H
