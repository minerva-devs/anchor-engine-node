# Anchor Engine C++ Core Library
# High-performance core algorithms for Anchor Engine

cmake_minimum_required(VERSION 3.16)
project(anchor_core VERSION 0.1.0 LANGUAGES CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build options
option(BUILD_SHARED_LIBS "Build shared library" ON)
option(BUILD_TESTS "Build tests" OFF)
option(BUILD_NAPI_BINDINGS "Build Node.js N-API bindings" OFF)

# Compiler flags
if(MSVC)
    add_compile_options(/W4 /O2 /std:c++17)
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
else()
    add_compile_options(-Wall -Wextra -O3 -std=c++17)
endif()

# Find dependencies
find_package(SQLite3 REQUIRED)
find_package(nlohmann_json REQUIRED)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${SQLite3_INCLUDE_DIRS}
)

# Core library sources
set(CORE_SOURCES
    src/physics_walker.cpp
    src/context_inflator.cpp
    src/deduplicator.cpp
    src/transient_filter.cpp
    src/simhash.cpp
    src/graph_traversal.cpp
    src/unified_field_equation.cpp
)

# Core library headers
set(CORE_HEADERS
    include/physics_walker.h
    include/context_inflator.h
    include/deduplicator.h
    include/transient_filter.h
    include/simhash.h
    include/graph_traversal.h
    include/unified_field_equation.h
    include/types.h
    include/database.h
)

# Create core library
add_library(anchor_core ${CORE_SOURCES} ${CORE_HEADERS})

target_link_libraries(anchor_core
    ${SQLite3_LIBRARIES}
    nlohmann_json::nlohmann_json
)

target_include_directories(anchor_core
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

# N-API bindings (optional, for Node.js integration)
if(BUILD_NAPI_BINDINGS)
    add_subdirectory(napi)
endif()

# Tests (optional)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Installation
install(TARGETS anchor_core
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)

# Print configuration summary
message(STATUS "")
message(STATUS "Anchor Core Configuration Summary:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Build Shared Libs: ${BUILD_SHARED_LIBS}")
message(STATUS "  Build Tests: ${BUILD_TESTS}")
message(STATUS "  Build N-API Bindings: ${BUILD_NAPI_BINDINGS}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "")
