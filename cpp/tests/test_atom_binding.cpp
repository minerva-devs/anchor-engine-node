#include <iostream>
#include <cassert>
#include <vector>
#include <optional>
#include "database.h"
#include "types.h"

using namespace anchor;

void test_atom_binding() {
    std::cout << "Testing atom binding..." << std::endl;

    // 1. Initialize Database
    Database db = Database::inMemory();

    // 2. Create a Source (foreign key requirement)
    Source source;
    source.id = "src1";
    source.path = "/tmp/test.txt";
    source.created_at = 1000.0;
    source.updated_at = 1000.0;
    db.upsertSource(source);

    // 3. Create Atom with all fields
    Atom atom1;
    atom1.source_id = "src1";
    atom1.content = "content1";
    atom1.char_start = 0;
    atom1.char_end = 8;
    atom1.timestamp = 1001.0;
    atom1.simhash = 12345;
    atom1.metadata = "meta1";
    atom1.compound_id = "cmp1";
    atom1.start_byte = 10;
    atom1.end_byte = 20;

    // 4. Insert Atom
    AtomId id1 = db.insertAtom(atom1);

    // 5. Retrieve Atom
    Atom retrieved1 = db.getAtom(id1);

    // 6. Verify fields
    assert(retrieved1.metadata.has_value());
    assert(*retrieved1.metadata == "meta1");
    assert(retrieved1.compound_id.has_value());
    assert(*retrieved1.compound_id == "cmp1");
    assert(retrieved1.start_byte.has_value());
    assert(*retrieved1.start_byte == 10);
    assert(retrieved1.end_byte.has_value());
    assert(*retrieved1.end_byte == 20);

    std::cout << "  Passed: All fields populated." << std::endl;

    // 7. Create Atom with optional fields empty
    Atom atom2;
    atom2.source_id = "src1";
    atom2.content = "content2";
    atom2.char_start = 10;
    atom2.char_end = 18;
    atom2.timestamp = 1002.0;
    atom2.simhash = 67890;
    // metadata, compound_id, start_byte, end_byte are empty by default

    // 8. Insert Atom
    AtomId id2 = db.insertAtom(atom2);

    // 9. Retrieve Atom
    Atom retrieved2 = db.getAtom(id2);

    // 10. Verify fields
    assert(!retrieved2.metadata.has_value());
    assert(!retrieved2.compound_id.has_value());
    assert(!retrieved2.start_byte.has_value());
    assert(!retrieved2.end_byte.has_value());

    std::cout << "  Passed: Optional fields empty." << std::endl;
}

int main() {
    try {
        test_atom_binding();
        std::cout << "All tests passed!" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed: " << e.what() << std::endl;
        return 1;
    }
}
