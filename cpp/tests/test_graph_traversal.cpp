#include "graph_traversal.h"
#include "database.h"
#include <iostream>
#include <cassert>
#include <vector>
#include <optional>

using namespace anchor;

void test_bfs() {
    std::cout << "Testing BFS Traversal..." << std::endl;

    // Create in-memory database
    Database db = Database::inMemory();

    // Insert sources first
    Source s1;
    s1.id = "src1";
    s1.path = "path/to/src1";
    s1.created_at = 100.0;
    s1.updated_at = 100.0;
    db.upsertSource(s1);

    Source s2;
    s2.id = "src2";
    s2.path = "path/to/src2";
    s2.created_at = 100.0;
    s2.updated_at = 100.0;
    db.upsertSource(s2);

    Atom a1;
    a1.source_id = "src1";
    a1.content = "content1";
    a1.char_start = 0;
    a1.char_end = 10;
    a1.timestamp = 100.0;
    a1.simhash = 0x123;
    AtomId id1 = db.insertAtom(a1);

    Atom a2;
    a2.source_id = "src1";
    a2.content = "content2";
    a2.char_start = 10;
    a2.char_end = 20;
    a2.timestamp = 101.0;
    a2.simhash = 0x124;
    AtomId id2 = db.insertAtom(a2);

    Atom a3;
    a3.source_id = "src2";
    a3.content = "content3";
    a3.char_start = 0;
    a3.char_end = 10;
    a3.timestamp = 102.0;
    a3.simhash = 0x125;
    AtomId id3 = db.insertAtom(a3);

    Atom a4;
    a4.source_id = "src2";
    a4.content = "content4";
    a4.char_start = 10;
    a4.char_end = 20;
    a4.timestamp = 103.0;
    a4.simhash = 0x126;
    AtomId id4 = db.insertAtom(a4);

    // Insert edges: 1->2, 1->3, 2->4
    Edge e1;
    e1.from = id1;
    e1.to = id2;
    e1.weight = 1.0;
    e1.edge_type = "test";
    db.insertEdge(e1);

    Edge e2;
    e2.from = id1;
    e2.to = id3;
    e2.weight = 1.0;
    e2.edge_type = "test";
    db.insertEdge(e2);

    Edge e3;
    e3.from = id2;
    e3.to = id4;
    e3.weight = 1.0;
    e3.edge_type = "test";
    db.insertEdge(e3);

    // BFS from 1 with max_hops=2
    std::vector<Edge> result_edges = bfsTraversal(db, id1, 2);

    std::cout << "Traversed " << result_edges.size() << " edges." << std::endl;

    // Check results
    bool found_1_2 = false;
    bool found_1_3 = false;
    bool found_2_4 = false;

    for (const auto& e : result_edges) {
        std::cout << "Edge: " << e.from << " -> " << e.to << std::endl;
        if (e.from == id1 && e.to == id2) found_1_2 = true;
        if (e.from == id1 && e.to == id3) found_1_3 = true;
        if (e.from == id2 && e.to == id4) found_2_4 = true;
    }

    assert(result_edges.size() == 3);
    assert(found_1_2);
    assert(found_1_3);
    assert(found_2_4);

    std::cout << "BFS Traversal Test Passed!" << std::endl;
}

int main() {
    try {
        test_bfs();
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
