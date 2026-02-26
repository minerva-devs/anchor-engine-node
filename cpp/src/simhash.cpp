#include "simhash.h"
#include "md5.h"
#include <functional>
#include <sstream>
#include <vector>
#include <cstring>
#include <algorithm>
#include <string>
#include <cctype>

namespace anchor {

namespace {
    // FNV-1a 64-bit hash implementation
    uint64_t fnv1a_64(const std::string& text) {
        uint64_t hash = 14695981039346656037ULL;
        for (char c : text) {
            hash ^= static_cast<unsigned char>(c);
            hash *= 1099511628211ULL;
        }
        return hash;
    }
}

SimHash computeSimHash(const std::string& text) {
    if (text.empty()) {
        return 0;
    }

    std::vector<int> v(64, 0);
    std::string token;
    std::istringstream tokenStream(text);

    while (tokenStream >> token) {
        // Hash the token using MD5
        MD5Hash md5 = computeMD5(token);

        // Use first 8 bytes (64 bits) of MD5 as the token hash
        uint64_t hash = 0;
        for (int i = 0; i < 8; ++i) {
            hash |= (static_cast<uint64_t>(md5[i]) << (i * 8));
        }

        // Update vector
        for (int i = 0; i < 64; ++i) {
            if ((hash >> i) & 1) {
                v[i]++;
            } else {
                v[i]--;
            }
        }
    }

    SimHash fingerprint = 0;
    for (int i = 0; i < 64; ++i) {
        if (v[i] > 0) {
            fingerprint |= (1ULL << i);
        }
    }

    return fingerprint;
}

int hammingDistance(SimHash hash1, SimHash hash2) {
    SimHash diff = hash1 ^ hash2;
    return __builtin_popcountll(diff);
}

} // namespace anchor
