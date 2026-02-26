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
