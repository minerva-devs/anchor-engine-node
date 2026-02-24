#ifndef ANCHOR_CORE_SIMHASH_H
#define ANCHOR_CORE_SIMHASH_H

#include "types.h"

namespace anchor {

/**
 * @brief Compute SimHash fingerprint for text
 * @param text Input text
 * @return SimHash 64-bit fingerprint
 */
SimHash computeSimHash(const std::string& text);

/**
 * @brief Compute Hamming distance between two SimHashes
 * @param hash1 First hash
 * @param hash2 Second hash
 * @return int Hamming distance (0-64)
 */
int hammingDistance(SimHash hash1, SimHash hash2);

} // namespace anchor

#endif // ANCHOR_CORE_SIMHASH_H
