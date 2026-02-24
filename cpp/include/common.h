/**
 * @file common.h
 * @brief Common includes and cross-platform compatibility
 */

#ifndef ANCHOR_CORE_COMMON_H
#define ANCHOR_CORE_COMMON_H

// Platform detection
#ifdef _MSC_VER
    #define ANCHOR_COMPILER_MSVC 1
#elif defined(__GNUC__) || defined(__clang__)
    #define ANCHOR_COMPILER_GCC 1
#endif

// Windows-specific
#ifdef _WIN32
    #define ANCHOR_PLATFORM_WINDOWS 1
    #ifndef NOMINMAX
        #define NOMINMAX
    #endif
    #ifndef WIN32_LEAN_AND_MEAN
        #define WIN32_LEAN_AND_MEAN
    #endif
#endif

// Cross-platform popcount
#ifdef ANCHOR_COMPILER_MSVC
    #include <intrin.h>
    #define __builtin_popcountll __popcnt64
#elif defined(ANCHOR_COMPILER_GCC) || defined(__clang__)
    // __builtin_popcountll already available
#else
    // Portable fallback
    #ifndef __builtin_popcountll
    inline int __builtin_popcountll(uint64_t x) {
        int count = 0;
        while (x) {
            count += static_cast<int>(x & 1);
            x >>= 1;
        }
        return count;
    }
    #endif
#endif

// Standard library includes (common to all files)
#include <string>
#include <vector>
#include <cstdint>
#include <optional>
#include <chrono>
#include <algorithm>
#include <cmath>
#include <iterator>
#include <memory>
#include <mutex>
#include <sstream>
#include <fstream>
#include <iostream>

// JSON forward declaration
#include <nlohmann/json_fwd.hpp>

// SQLite3
#include <sqlite3.h>

#endif // ANCHOR_CORE_COMMON_H
