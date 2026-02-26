project(anchor_core_tests)

# Find GoogleTest or use simple test runner
# For now, we will use a simple standalone test runner to avoid dependencies

add_executable(test_simhash test_simhash.cpp)

# Link against anchor_core library
target_link_libraries(test_simhash PRIVATE anchor_core)

# Add test to CTest
add_test(NAME test_simhash COMMAND test_simhash)

# Atom binding test
add_executable(test_atom_binding test_atom_binding.cpp)

target_link_libraries(test_atom_binding
    PRIVATE
    anchor_core
)

target_include_directories(test_atom_binding
    PRIVATE
    ${CMAKE_SOURCE_DIR}/include
)

add_test(NAME test_atom_binding COMMAND test_atom_binding)
