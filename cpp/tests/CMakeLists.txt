
project(anchor_core_tests)

# Find GoogleTest or use simple test runner
# For now, we will use a simple standalone test runner to avoid dependencies

add_executable(test_simhash test_simhash.cpp)

# Link against anchor_core library
target_link_libraries(test_simhash PRIVATE anchor_core)

# Add test to CTest
add_test(NAME test_simhash COMMAND test_simhash)
