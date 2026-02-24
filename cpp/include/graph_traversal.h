#ifndef ANCHOR_CORE_GRAPH_TRAVERSAL_H
#define ANCHOR_CORE_GRAPH_TRAVERSAL_H

#include "types.h"
#include "database.h"
#include <vector>

namespace anchor {

/**
 * @brief Perform BFS graph traversal with hop tracking
 * @param db Database connection
 * @param start_id Starting atom ID
 * @param max_hops Maximum hop distance
 * @return std::vector<Edge> Traversed edges
 */
std::vector<Edge> bfsTraversal(Database& db, AtomId start_id, int max_hops);

/**
 * @brief Find all atoms connected via shared tags
 * @param db Database connection
 * @param atom_id Atom ID
 * @return std::vector<AtomId> Connected atom IDs
 */
std::vector<AtomId> findTagNeighbors(Database& db, AtomId atom_id);

} // namespace anchor

#endif // ANCHOR_CORE_GRAPH_TRAVERSAL_H
