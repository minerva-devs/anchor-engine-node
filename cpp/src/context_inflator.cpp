/**
 * @file context_inflator.cpp
 * @brief Implementation of context inflation (n-1, n+1 expansion)
 */

#include "context_inflator.h"
#include "file_utils.h"
#include <algorithm>
#include <filesystem>

namespace anchor {

ContextInflator::ContextInflator(const ContextInflatorConfig& config)
    : config_(config) {}

ContextInflator::~ContextInflator() = default;

std::vector<Atom> ContextInflator::inflate(
    Database& db,
    const std::vector<AtomId>& atom_ids,
    size_t max_chars
) {
    std::vector<Atom> inflated_atoms;
    inflated_atoms.reserve(atom_ids.size());
    
    for (AtomId atom_id : atom_ids) {
        try {
            // Step 1: Load atom with coordinates
            Atom atom = db.getAtom(atom_id);
            
            // Skip if no compound_id or coordinates
            if (!atom.compound_id.has_value() || 
                !atom.start_byte.has_value() || 
                !atom.end_byte.has_value()) {
                inflated_atoms.push_back(atom);
                continue;
            }
            
            // Step 2: Read full compound file from mirrored_brain/
            std::string compound_path = getCompoundPath(atom.compound_id.value());
            
            if (!fileExists(compound_path)) {
                // File not found, return atom as-is
                inflated_atoms.push_back(atom);
                continue;
            }
            
            auto full_content = readFile(compound_path);
            if (!full_content.has_value()) {
                inflated_atoms.push_back(atom);
                continue;
            }
            
            // Step 3: Expand to paragraph boundaries with max_chars limit
            size_t original_start = atom.start_byte.value();
            size_t original_end = atom.end_byte.value();
            
            // Calculate expansion radius
            size_t base_radius = config_.base_radius;
            size_t expanded_start = (original_start > base_radius) 
                ? original_start - base_radius 
                : 0;
            size_t expanded_end = std::min(
                original_end + base_radius,
                full_content.value().size()
            );
            
            // Step 4: Snap to paragraph boundaries
            if (config_.expand_to_paragraphs) {
                expanded_start = findParagraphBoundaryBefore(
                    full_content.value(),
                    expanded_start
                );
                expanded_end = findParagraphBoundaryAfter(
                    full_content.value(),
                    expanded_end
                );
            }
            
            // Step 5: Respect max_chars limit
            size_t content_length = expanded_end - expanded_start;
            if (content_length > max_chars) {
                // Center the content around the original atom
                size_t excess = content_length - max_chars;
                size_t trim_start = excess / 2;
                size_t trim_end = excess - trim_start;
                
                expanded_start += trim_start;
                expanded_end -= trim_end;
            }
            
            // Step 6: Extract expanded content
            auto expanded_content = readFileRange(
                compound_path,
                expanded_start,
                expanded_end
            );
            
            if (expanded_content.has_value()) {
                // Update atom with expanded content
                atom.content = expanded_content.value();
                atom.char_start = expanded_start;
                atom.char_end = expanded_end;
                
                inflated_atoms.push_back(atom);
            } else {
                inflated_atoms.push_back(atom);
            }
            
        } catch (const DatabaseError& e) {
            // Atom not found or other error, skip
            continue;
        }
    }
    
    return inflated_atoms;
}

std::string ContextInflator::getCompoundPath(const std::string& compound_id) const {
    // Compound ID format: "mirrored_brain/@inbox/project_name/filename.yaml"
    // or stored in database as full path
    
    // Check if compound_id is already a full path
    if (std::filesystem::exists(compound_id)) {
        return compound_id;
    }
    
    // Otherwise, construct path from mirrored_brain/
    // This assumes compound_id is stored as relative path
    std::string base_path = "mirrored_brain/";
    
    // Remove leading @ if present (internal marker)
    std::string relative_path = compound_id;
    if (relative_path.find("@") == 0) {
        relative_path = relative_path.substr(1);
    }
    
    return base_path + relative_path;
}

std::vector<Atom> ContextInflator::inflateFromMolecules(
    Database& db,
    const std::vector<AtomId>& molecule_ids,
    size_t max_chars
) {
    // Similar to inflate(), but works with molecules instead of atoms
    // Molecules have compound_id and byte coordinates
    
    std::vector<Atom> inflated;
    
    for (AtomId molecule_id : molecule_ids) {
        try {
            Atom molecule = db.getAtom(molecule_id);
            
            if (!molecule.compound_id.has_value()) {
                inflated.push_back(molecule);
                continue;
            }
            
            std::string compound_path = getCompoundPath(molecule.compound_id.value());
            
            if (!fileExists(compound_path)) {
                inflated.push_back(molecule);
                continue;
            }
            
            auto full_content = readFile(compound_path);
            if (!full_content.has_value()) {
                inflated.push_back(molecule);
                continue;
            }
            
            // Use molecule's byte coordinates
            size_t start = molecule.start_byte.value_or(0);
            size_t end = molecule.end_byte.value_or(full_content.value().size());
            
            // Expand with limits
            size_t base_radius = config_.base_radius;
            size_t expanded_start = (start > base_radius) ? start - base_radius : 0;
            size_t expanded_end = std::min(end + base_radius, full_content.value().size());
            
            // Snap to paragraph boundaries
            if (config_.expand_to_paragraphs) {
                expanded_start = findParagraphBoundaryBefore(
                    full_content.value(),
                    expanded_start
                );
                expanded_end = findParagraphBoundaryAfter(
                    full_content.value(),
                    expanded_end
                );
            }
            
            // Respect max_chars
            size_t content_length = expanded_end - expanded_start;
            if (content_length > max_chars) {
                size_t excess = content_length - max_chars;
                size_t trim_start = excess / 2;
                expanded_start += trim_start;
            }
            
            // Extract content
            auto expanded_content = readFileRange(
                compound_path,
                expanded_start,
                expanded_end
            );
            
            if (expanded_content.has_value()) {
                molecule.content = expanded_content.value();
                molecule.char_start = expanded_start;
                molecule.char_end = expanded_end;
                inflated.push_back(molecule);
            } else {
                inflated.push_back(molecule);
            }
            
        } catch (...) {
            continue;
        }
    }
    
    return inflated;
}

} // namespace anchor
