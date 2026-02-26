enable_testing()

add_executable(test_database test_database.cpp)
target_link_libraries(test_database PRIVATE anchor_core)
add_test(NAME test_database COMMAND test_database)
