#undef NDEBUG
#include <iostream>
#include <cassert>
#include <vector>
#include <string>
#include <optional>
#include "database.h"
#include "types.h"

void test_insert_molecule() {
    std::cout << "Running test_insert_molecule..." << std::endl;
    // Create in-memory database
    auto db = anchor::Database::inMemory();

    // Create a dummy atom to act as a molecule
    anchor::Atom molecule;
    molecule.source_id = "molecule_1"; // This will be the molecule ID
    molecule.content = "This is a molecule content";
    molecule.compound_id = "compound_A";
    molecule.start_byte = 100;
    molecule.end_byte = 200;
    molecule.timestamp = 1234567890.0;
    molecule.simhash = 0x1234567890ABCDEF; // Some random hash

    // Insert molecule
    try {
        db.insertMolecule(molecule);
        std::cout << "Molecule inserted successfully." << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Failed to insert molecule: " << e.what() << std::endl;
        exit(1);
    }

    // Verify by retrieving
    try {
        std::vector<anchor::Atom> molecules = db.getMoleculesByCompound("compound_A");
        if (molecules.size() != 1) {
            std::cerr << "Should retrieve 1 molecule, got " << molecules.size() << std::endl;
            exit(1);
        }

        const auto& retrieved = molecules[0];
        if (retrieved.source_id != molecule.source_id) { std::cerr << "Mismatch source_id" << std::endl; exit(1); }
        if (retrieved.compound_id != molecule.compound_id) { std::cerr << "Mismatch compound_id" << std::endl; exit(1); }
        if (retrieved.content != molecule.content) { std::cerr << "Mismatch content" << std::endl; exit(1); }
        if (retrieved.start_byte != molecule.start_byte) { std::cerr << "Mismatch start_byte" << std::endl; exit(1); }
        if (retrieved.end_byte != molecule.end_byte) { std::cerr << "Mismatch end_byte" << std::endl; exit(1); }
        if (retrieved.timestamp != molecule.timestamp) { std::cerr << "Mismatch timestamp" << std::endl; exit(1); }
        if (retrieved.simhash != molecule.simhash) { std::cerr << "Mismatch simhash" << std::endl; exit(1); }

        std::cout << "Molecule retrieval verified." << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Failed to retrieve molecules: " << e.what() << std::endl;
        exit(1);
    }
}

void test_missing_fields() {
    std::cout << "Running test_missing_fields..." << std::endl;
    auto db = anchor::Database::inMemory();

    anchor::Atom molecule;
    molecule.source_id = "molecule_bad";
    // Missing compound_id, start_byte, end_byte

    bool failed = false;
    try {
        db.insertMolecule(molecule);
    } catch (const std::invalid_argument&) {
        failed = true;
    } catch (...) {
        // Unexpected exception type
    }

    if (!failed) {
        std::cerr << "Should fail when fields are missing" << std::endl;
        exit(1);
    }
    std::cout << "Missing fields check passed." << std::endl;
}

int main() {
    try {
        test_insert_molecule();
        test_missing_fields();
        std::cout << "All tests passed!" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
}
