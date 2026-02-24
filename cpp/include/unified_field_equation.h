#ifndef ANCHOR_CORE_UNIFIED_FIELD_EQUATION_H
#define ANCHOR_CORE_UNIFIED_FIELD_EQUATION_H

#include "types.h"

namespace anchor {

/**
 * @brief Compute gravity score using Unified Field Equation
 * 
 * W(q,a) = |T(q) ∩ T(a)| · γ^(d(q,a)) × e^(-λΔt) × (1 - H(h_q,h_a)/64)
 * 
 * @param shared_tags Number of shared tags
 * @param hop_distance Graph hop distance
 * @param delta_t Time difference in seconds
 * @param simhash_diff SimHash Hamming distance
 * @param config Physics walker configuration
 * @return double Gravity score (0.0 - 1.0)
 */
double computeGravityScore(
    int shared_tags,
    int hop_distance,
    double delta_t,
    int simhash_diff,
    const PhysicsWalkerConfig& config
);

} // namespace anchor

#endif // ANCHOR_CORE_UNIFIED_FIELD_EQUATION_H
