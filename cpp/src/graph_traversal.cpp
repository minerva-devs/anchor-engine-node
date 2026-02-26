#include "graph_traversal.h"
#include <unordered_set>
#include <algorithm>

namespace anchor {

std::vector<Edge> bfsTraversal(Database& db, AtomId start_id, int max_hops) {
    // TODO: Implement BFS traversal
    return {};
}

std::vector<AtomId> findTagNeighbors(Database& db, AtomId atom_id) {
    std::unordered_set<AtomId> neighbors;

    // Get tags for the atom
    auto tags = db.getTagsForAtom(atom_id);

    // For each tag, find other atoms with the same tag
    for (const auto& tag : tags) {
        auto atoms = db.getAtomsByTag(tag.tag);
        for (const auto& atom : atoms) {
            if (atom.id != atom_id) {
                neighbors.insert(atom.id);
            }
        }
    }

    return std::vector<AtomId>(neighbors.begin(), neighbors.end());
}

} // namespace anchor
