#ifndef ANCHOR_CORE_TRANSIENT_FILTER_H
#define ANCHOR_CORE_TRANSIENT_FILTER_H

#include "types.h"
#include <vector>

namespace anchor {

class TransientFilter {
public:
    explicit TransientFilter(const TransientFilterConfig& config = TransientFilterConfig());
    ~TransientFilter();
    
    std::vector<Atom> apply(const std::vector<Atom>& atoms);

private:
    TransientFilterConfig config_;
};

} // namespace anchor

#endif // ANCHOR_CORE_TRANSIENT_FILTER_H
