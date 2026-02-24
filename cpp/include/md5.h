/**
 * @file md5.h
 * @brief MD5 fingerprinting for deduplication
 */

#ifndef ANCHOR_CORE_MD5_H
#define ANCHOR_CORE_MD5_H

#include <string>
#include <cstdint>
#include <array>

namespace anchor {

/**
 * @brief MD5 hash result (128-bit)
 */
using MD5Hash = std::array<uint8_t, 16>;

/**
 * @brief Compute MD5 hash of data
 * @param data Input data
 * @return MD5Hash 128-bit hash
 */
MD5Hash computeMD5(const std::string& data);

/**
 * @brief Compute MD5 hash of data range
 * @param data Input data
 * @param start Start position
 * @param length Length of data to hash
 * @return MD5Hash 128-bit hash
 */
MD5Hash computeMD5Range(
    const std::string& data,
    size_t start,
    size_t length
);

/**
 * @brief Convert MD5 hash to hex string
 * @param hash MD5 hash
 * @return std::string Hex string (32 chars)
 */
std::string md5ToHex(const MD5Hash& hash);

/**
 * @brief Compute MD5 fingerprint (first 16 hex chars)
 * @param data Input data
 * @return std::string Fingerprint (16 chars)
 */
std::string computeMD5Fingerprint(const std::string& data);

} // namespace anchor

#endif // ANCHOR_CORE_MD5_H
