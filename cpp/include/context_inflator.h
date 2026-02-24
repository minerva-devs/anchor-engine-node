#ifndef ANCHOR_CORE_CONTEXT_INFLATOR_H
#define ANCHOR_CORE_CONTEXT_INFLATOR_H

#include "types.h"
#include "database.h"
#include <vector>

namespace anchor {

class ContextInflator {
public:
    explicit ContextInflator(const ContextInflatorConfig& config = ContextInflatorConfig());
    ~ContextInflator();
    
    std::vector<Atom> inflate(Database& db, 
                             const std::vector<AtomId>& atom_ids,
                             size_t max_chars);

private:
    ContextInflatorConfig config_;
};

} // namespace anchor

#endif // ANCHOR_CORE_CONTEXT_INFLATOR_H
