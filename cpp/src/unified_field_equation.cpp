#include "unified_field_equation.h"
#include <cmath>

namespace anchor {

double computeGravityScore(
    int shared_tags,
    int hop_distance,
    double delta_t,
    int simhash_diff,
    const PhysicsWalkerConfig& config
) {
    // 1. Semantic Gravity with hop damping
    int clamped_hop = std::max(0, std::min(3, hop_distance));
    double semantic = (static_cast<double>(shared_tags) / 10.0) * 
                      std::pow(config.damping_factor, clamped_hop);
    
    // 2. Temporal Decay
    double temporal = std::exp(-config.temporal_decay * delta_t);
    
    // 3. Structural Gravity (SimHash similarity)
    double structural = 1.0 - (static_cast<double>(simhash_diff) / 64.0);
    
    // 4. Unified Field Equation (multiplicative)
    double score = semantic * temporal * structural;
    
    // 5. Clamp to [0, 1]
    return std::max(0.0, std::min(1.0, score));
}

} // namespace anchor
