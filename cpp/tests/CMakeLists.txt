project(anchor_core_tests)
enable_testing()

# Find GoogleTest or use simple test runner
# For now, we will use a simple standalone test runner to avoid dependencies

# Database tests
add_executable(test_database test_database.cpp)
target_link_libraries(test_database PRIVATE anchor_core)
add_test(NAME test_database COMMAND test_database)

# SimHash tests
add_executable(test_simhash test_simhash.cpp)
target_link_libraries(test_simhash PRIVATE anchor_core)
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
