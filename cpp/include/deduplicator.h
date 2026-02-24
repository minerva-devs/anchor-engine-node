#ifndef ANCHOR_CORE_DEDUPLICATOR_H
#define ANCHOR_CORE_DEDUPLICATOR_H

#include "types.h"
#include <vector>

namespace anchor {

class Deduplicator {
public:
    explicit Deduplicator(const DeduplicatorConfig& config = DeduplicatorConfig());
    ~Deduplicator();
    
    std::vector<Candidate> deduplicate(const std::vector<Candidate>& candidates);

private:
    DeduplicatorConfig config_;
};

} // namespace anchor

#endif // ANCHOR_CORE_DEDUPLICATOR_H
