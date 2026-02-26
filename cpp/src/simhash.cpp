#include "simhash.h"
#include <functional>
#include <sstream>
#include <vector>
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

    // Weight vector for 64 bits
    std::vector<int> weights(64, 0);

    // Simple tokenizer: split by whitespace
    std::stringstream ss(text);
    std::string token;

    while (ss >> token) {
        // Compute hash for the token
        uint64_t hash = fnv1a_64(token);

        // Update weights based on hash bits
        for (int i = 0; i < 64; ++i) {
            if ((hash >> i) & 1) {
                weights[i]++;
            } else {
                weights[i]--;
            }
        }
    }

    // Construct fingerprint from weights
    SimHash fingerprint = 0;
    for (int i = 0; i < 64; ++i) {
        if (weights[i] > 0) {
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
