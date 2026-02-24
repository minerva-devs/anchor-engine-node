#ifndef ANCHOR_CORE_DEDUPLICATOR_H
#define ANCHOR_CORE_DEDUPLICATOR_H

#include "types.h"
#include <vector>
#include <string>

namespace anchor {

class Deduplicator {
public:
    explicit Deduplicator(const DeduplicatorConfig& config = DeduplicatorConfig());
    ~Deduplicator();

    std::vector<Candidate> deduplicate(const std::vector<Candidate>& candidates);

    std::vector<Candidate> deduplicateWithContent(
        const std::vector<Candidate>& candidates,
        const std::vector<std::string>& contents
    );

private:
    DeduplicatorConfig config_;

    double computeGeometricOverlap(const Candidate& a, const Candidate& b) const;
    bool checkMD5Fingerprint(const std::string& content_a, const std::string& content_b) const;
    bool checkContainment(const std::string& content_a, const std::string& content_b) const;
    bool checkFuzzyPrefix(const std::string& content_a, const std::string& content_b) const;
    int computeHammingDistance(uint64_t hash1, uint64_t hash2) const;
};

} // namespace anchor

#endif // ANCHOR_CORE_DEDUPLICATOR_H
