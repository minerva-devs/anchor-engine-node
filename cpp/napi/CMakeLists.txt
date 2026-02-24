# N-API bindings for Anchor Core
cmake_minimum_required(VERSION 3.16)

# Find Node.js headers
find_package(NodeJS REQUIRED)

include_directories(${NODE_INCLUDE_DIRS})

# Create N-API module
add_library(anchor_core_napi SHARED
    src/anchor_core_napi.cpp
    src/physics_walker_napi.cpp
    src/context_inflator_napi.cpp
    src/deduplicator_napi.cpp
    src/transient_filter_napi.cpp
)

target_link_libraries(anchor_core_napi
    anchor_core
    ${NODE_LIBRARIES}
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
