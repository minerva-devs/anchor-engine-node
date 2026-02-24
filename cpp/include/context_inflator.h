#ifndef ANCHOR_CORE_CONTEXT_INFLATOR_H
#define ANCHOR_CORE_CONTEXT_INFLATOR_H

#include "types.h"
#include "database.h"
#include <vector>
#include <string>

namespace anchor {

class ContextInflator {
public:
    explicit ContextInflator(const ContextInflatorConfig& config = ContextInflatorConfig());
    ~ContextInflator();

    std::vector<Atom> inflate(Database& db,
                             const std::vector<AtomId>& atom_ids,
                             size_t max_chars);

    std::vector<Atom> inflateFromMolecules(Database& db,
                                          const std::vector<AtomId>& molecule_ids,
                                          size_t max_chars);

private:
    ContextInflatorConfig config_;

    std::string getCompoundPath(const std::string& compound_id) const;
};

} // namespace anchor

#endif // ANCHOR_CORE_CONTEXT_INFLATOR_H
