# N-API bindings for Anchor Core
cmake_minimum_required(VERSION 3.16)

# Find Node.js headers
# Use bundled headers in deps/nodejs/include
set(NODE_INCLUDE_DIR ${CMAKE_SOURCE_DIR}/deps/nodejs/include)

# Check if Node.js headers exist
if(NOT EXISTS "${NODE_INCLUDE_DIR}/node.h")
    message(FATAL_ERROR "Node.js headers not found at ${NODE_INCLUDE_DIR}. Please download Node.js headers.")
endif()

include_directories(${NODE_INCLUDE_DIR})
include_directories(${CMAKE_SOURCE_DIR}/include)

# Create N-API module
add_library(anchor_core_napi SHARED
    src/anchor_core_napi.cpp
)

target_link_libraries(anchor_core_napi
    anchor_core
)

set_target_properties(anchor_core_napi PROPERTIES
    PREFIX ""
    OUTPUT_NAME "anchor_core"
    SUFFIX ".node"
)

# Copy to Node.js directory
add_custom_command(TARGET anchor_core_napi POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy
    $<TARGET_FILE:anchor_core_napi>
    ${CMAKE_SOURCE_DIR}/../engine/native/anchor_core.node
)
