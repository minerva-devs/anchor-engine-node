/**
 * @file transient_filter.h
 * @brief Transient data filter for noise removal
 */

#ifndef ANCHOR_CORE_TRANSIENT_FILTER_H
#define ANCHOR_CORE_TRANSIENT_FILTER_H

#include "types.h"
#include <vector>
#include <string>
#include <regex>

namespace anchor {

/**
 * @brief Filter for removing transient/noise content
 * 
 * Identifies and filters out:
 * - Terminal error logs (Traceback, KeyError, etc.)
 * - Package installation output (npm install, pip install)
 * - Build artifacts (Build succeeded, Compiling...)
 * - Other noise patterns
 */
class TransientFilter {
public:
    /**
     * @brief Construct a new Transient Filter
     * @param config Filter configuration
     */
    explicit TransientFilter(const TransientFilterConfig& config = TransientFilterConfig());
    
    /**
     * @brief Destroy the Transient Filter
     */
    ~TransientFilter();
    
    /**
     * @brief Apply filter to atoms
     * 
     * @param atoms Input atoms
     * @return std::vector<Atom> Filtered atoms
     */
    std::vector<Atom> apply(const std::vector<Atom>& atoms);
    
    /**
     * @brief Check if content is transient
     * 
     * @param content Content to check
     * @return true if transient (should be filtered)
     * @return false if permanent (should be kept)
     */
    bool isTransient(const std::string& content) const;
    
    /**
     * @brief Add custom pattern
     * 
     * @param pattern Regex pattern to match
     */
    void addPattern(const std::string& pattern);
    
    /**
     * @brief Remove custom pattern
     * 
     * @param pattern Pattern to remove
     */
    void removePattern(const std::string& pattern);
    
    /**
     * @brief Get all patterns
     * 
     * @return std::vector<std::string> All patterns
     */
    std::vector<std::string> getPatterns() const;

private:
    TransientFilterConfig config_;
    std::vector<std::regex> patterns_;
    std::vector<std::string> pattern_strings_;
    
    /**
     * @brief Initialize default patterns
     */
    void initializePatterns();
    
    /**
     * @brief Check content length
     * 
     * @param content Content to check
     * @return true if too short
     */
    bool checkMinLength(const std::string& content) const;
    
    /**
     * @brief Check for error patterns
     * 
     * @param content Content to check
     * @return true if error detected
     */
    bool checkErrorPatterns(const std::string& content) const;
    
    /**
     * @brief Check for installation patterns
     * 
     * @param content Content to check
     * @return true if installation detected
     */
    bool checkInstallationPatterns(const std::string& content) const;
    
    /**
     * @brief Check for build patterns
     * 
     * @param content Content to check
     * @return true if build output detected
     */
    bool checkBuildPatterns(const std::string& content) const;
};

} // namespace anchor

#endif // ANCHOR_CORE_TRANSIENT_FILTER_H
