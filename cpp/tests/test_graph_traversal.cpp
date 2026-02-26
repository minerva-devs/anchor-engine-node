#include "graph_traversal.h"
#include "database.h"
#include <cassert>
#include <iostream>
#include <algorithm>
#include <vector>

using namespace anchor;

void test_findTagNeighbors() {
    std::cout << "Starting test_findTagNeighbors..." << std::endl;
    auto db = Database::inMemory();

    // Create source
    Source source;
    source.id = "test_source";
    source.path = "test_path";
    source.created_at = 0;
    source.updated_at = 0;
    db.upsertSource(source);

    // Create atoms
    Atom a1; a1.source_id = "test_source"; a1.content = "Atom 1"; a1.simhash = 1; a1.char_start = 0; a1.char_end = 10; a1.timestamp = 1000;
    Atom a2; a2.source_id = "test_source"; a2.content = "Atom 2"; a2.simhash = 2; a2.char_start = 11; a2.char_end = 20; a2.timestamp = 2000;
    Atom a3; a3.source_id = "test_source"; a3.content = "Atom 3"; a3.simhash = 3; a3.char_start = 21; a3.char_end = 30; a3.timestamp = 3000;

    AtomId id1 = db.insertAtom(a1);
    AtomId id2 = db.insertAtom(a2);
    AtomId id3 = db.insertAtom(a3);

    std::cout << "Inserted atoms: " << id1 << ", " << id2 << ", " << id3 << std::endl;

    // Add tags
    // Atom 1 and 2 share "science"
    // Atom 2 and 3 share "physics"
    // Atom 1 has "chemistry"

    std::vector<Tag> tags1 = {{0, id1, "science", {}}, {0, id1, "chemistry", {}}};
    std::vector<Tag> tags2 = {{0, id2, "science", {}}, {0, id2, "physics", {}}};
    std::vector<Tag> tags3 = {{0, id3, "physics", {}}};

    db.addTags(id1, tags1);
    db.addTags(id2, tags2);
    db.addTags(id3, tags3);

    std::cout << "Added tags." << std::endl;

    // Test neighbors for Atom 1
    // Should be Atom 2 (shared "science")
    auto neighbors1 = findTagNeighbors(db, id1);
    std::cout << "Neighbors for Atom 1: " << neighbors1.size() << std::endl;
    for (auto n : neighbors1) std::cout << n << " ";
    std::cout << std::endl;

    assert(neighbors1.size() == 1);
    assert(neighbors1[0] == id2);

    // Test neighbors for Atom 2
    // Should be Atom 1 ("science") and Atom 3 ("physics")
    auto neighbors2 = findTagNeighbors(db, id2);
    std::cout << "Neighbors for Atom 2: " << neighbors2.size() << std::endl;
    for (auto n : neighbors2) std::cout << n << " ";
    std::cout << std::endl;

    assert(neighbors2.size() == 2);
    // Sort to verify
    std::sort(neighbors2.begin(), neighbors2.end());
    assert(neighbors2[0] == id1);
    assert(neighbors2[1] == id3);

    // Test neighbors for Atom 3
    // Should be Atom 2 ("physics")
    auto neighbors3 = findTagNeighbors(db, id3);
    std::cout << "Neighbors for Atom 3: " << neighbors3.size() << std::endl;
    for (auto n : neighbors3) std::cout << n << " ";
    std::cout << std::endl;

    assert(neighbors3.size() == 1);
    assert(neighbors3[0] == id2);

    std::cout << "test_findTagNeighbors passed!" << std::endl;
}

int main() {
    try {
        test_findTagNeighbors();
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Test failed with unknown exception" << std::endl;
        return 1;
    }
    return 0;
}
