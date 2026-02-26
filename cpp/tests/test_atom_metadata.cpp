#include "database.h"
#include <cassert>
#include <iostream>
#include <optional>

int main() {
    using namespace anchor;

    // Setup
    std::cout << "Creating in-memory database..." << std::endl;
    auto db = Database::inMemory();

    // Create source (required for foreign key)
    Source source;
    source.id = "source1";
    source.path = "/path/to/source";
    source.created_at = 1000.0;
    source.updated_at = 2000.0;
    db.upsertSource(source);

    // Create atom with metadata
    Atom atom;
    atom.source_id = "source1";
    atom.content = "content";
    atom.char_start = 0;
    atom.char_end = 7;
    atom.timestamp = 1234.5;
    atom.simhash = 0xDEADBEEF;

    // Fields to test
    atom.metadata = "{\"key\": \"value\"}";
    atom.compound_id = "compound1";
    atom.start_byte = 100;
    atom.end_byte = 200;

    // Insert
    std::cout << "Inserting atom..." << std::endl;
    AtomId id = db.insertAtom(atom);

    // Retrieve
    std::cout << "Retrieving atom..." << std::endl;
    Atom retrieved = db.getAtom(id);

    // Verify
    assert(retrieved.id == id);
    assert(retrieved.source_id == atom.source_id);

    bool passed = true;

    if (!retrieved.metadata.has_value() || retrieved.metadata.value() != atom.metadata.value()) {
        std::cerr << "Metadata mismatch or missing!" << std::endl;
        if (retrieved.metadata.has_value()) {
            std::cerr << "Got: " << retrieved.metadata.value() << std::endl;
        } else {
            std::cerr << "Got: (null)" << std::endl;
        }
        passed = false;
    }

    if (!retrieved.compound_id.has_value() || retrieved.compound_id.value() != atom.compound_id.value()) {
        std::cerr << "Compound ID mismatch or missing!" << std::endl;
        passed = false;
    }

    if (!retrieved.start_byte.has_value() || retrieved.start_byte.value() != atom.start_byte.value()) {
        std::cerr << "Start byte mismatch or missing!" << std::endl;
        passed = false;
    }

    if (!retrieved.end_byte.has_value() || retrieved.end_byte.value() != atom.end_byte.value()) {
        std::cerr << "End byte mismatch or missing!" << std::endl;
        passed = false;
    }

    if (passed) {
        std::cout << "All tests passed!" << std::endl;
        return 0;
    } else {
        std::cout << "Tests failed!" << std::endl;
        return 1;
    }
}
