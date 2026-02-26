# Test executable for graph traversal
add_executable(test_graph_traversal test_graph_traversal.cpp)

target_link_libraries(test_graph_traversal
    PRIVATE
    anchor_core
    sqlite3_amalgamation
    nlohmann_json::nlohmann_json
)

# Enable testing for this directory
add_test(NAME TestGraphTraversal COMMAND test_graph_traversal)
