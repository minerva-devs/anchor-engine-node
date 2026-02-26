# Add test executable
add_executable(test_graph_traversal test_graph_traversal.cpp)

# Link against anchor_core
target_link_libraries(test_graph_traversal PRIVATE anchor_core)

# Register test
add_test(NAME test_graph_traversal COMMAND test_graph_traversal)
