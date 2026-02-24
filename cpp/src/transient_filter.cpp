/**
 * @file transient_filter.cpp
 * @brief Implementation of transient data filter
 */

#include "transient_filter.h"
#include <algorithm>

namespace anchor {

TransientFilter::TransientFilter(const TransientFilterConfig& config)
    : config_(config) {
    initializePatterns();
}

TransientFilter::~TransientFilter() = default;

void TransientFilter::initializePatterns() {
    // Default patterns for transient content
    
    // Error logs
    pattern_strings_.push_back(R"(Traceback \(most recent call last\))");
    pattern_strings_.push_back(R"(KeyError:)");
    pattern_strings_.push_back(R"(ValueError:)");
    pattern_strings_.push_back(R"(TypeError:)");
    pattern_strings_.push_back(R"(AttributeError:)");
    pattern_strings_.push_back(R"(FileNotFoundError:)");
    pattern_strings_.push_back(R"(Exception:)");
    pattern_strings_.push_back(R"(Error:)");
    pattern_strings_.push_back(R"(FAILED)");
    pattern_strings_.push_back(R"(failed)");
    
    // Package installation
    pattern_strings_.push_back(R"(npm install)");
    pattern_strings_.push_back(R"(npm WARN)");
    pattern_strings_.push_back(R"(npm ERR)");
    pattern_strings_.push_back(R"(pip install)");
    pattern_strings_.push_back(R"(Collecting [a-zA-Z0-9_-]+)");
    pattern_strings_.push_back(R"(Downloading [a-zA-Z0-9_.-]+)");
    pattern_strings_.push_back(R"(Installing collected packages)");
    pattern_strings_.push_back(R"(Successfully installed)");
    pattern_strings_.push_back(R"(Requirement already satisfied)");
    pattern_strings_.push_back(R"(yarn install)");
    pattern_strings_.push_back(R"(yarn add)");
    
    // Build output
    pattern_strings_.push_back(R"(Build succeeded)");
    pattern_strings_.push_back(R"(Build failed)");
    pattern_strings_.push_back(R"(Compiling\.\.\.)");
    pattern_strings_.push_back(R"(Linking\.\.\.)");
    pattern_strings_.push_back(R"(Generating\.\.\.)");
    pattern_strings_.push_back(R"(Copying\.\.\.)");
    pattern_strings_.push_back(R"(Deleting\.\.\.)");
    pattern_strings_.push_back(R"(Cleaning\.\.\.)");
    pattern_strings_.push_back(R"(mkdir -p)");
    pattern_strings_.push_back(R"(cp -r)");
    pattern_strings_.push_back(R"(rm -rf)");
    
    // Terminal output
    pattern_strings_.push_back(R"(^\$ )");  // Command prompt
    pattern_strings_.push_back(R"(^> )");   // Windows prompt
    pattern_strings_.push_back(R"(^% )");   // CMD prompt
    pattern_strings_.push_back(R"(^\[.*\] )");  // Log timestamps
    
    // Compile all patterns
    patterns_.clear();
    for (const auto& pattern_str : pattern_strings_) {
        try {
            patterns_.push_back(std::regex(pattern_str, std::regex::icase));
        } catch (const std::regex_error& e) {
            // Skip invalid patterns
            continue;
        }
    }
}

std::vector<Atom> TransientFilter::apply(const std::vector<Atom>& atoms) {
    std::vector<Atom> filtered;
    filtered.reserve(atoms.size());
    
    for (const auto& atom : atoms) {
        if (!isTransient(atom.content)) {
            filtered.push_back(atom);
        }
    }
    
    return filtered;
}

bool TransientFilter::isTransient(const std::string& content) const {
    // Check minimum length first (fast path)
    if (!checkMinLength(content)) {
        return true;
    }
    
    // Check error patterns
    if (checkErrorPatterns(content)) {
        return true;
    }
    
    // Check installation patterns
    if (checkInstallationPatterns(content)) {
        return true;
    }
    
    // Check build patterns
    if (checkBuildPatterns(content)) {
        return true;
    }
    
    // Not transient
    return false;
}

bool TransientFilter::checkMinLength(const std::string& content) const {
    return content.size() >= config_.min_content_length;
}

bool TransientFilter::checkErrorPatterns(const std::string& content) const {
    // Check for common error indicators
    const std::vector<std::string> error_indicators = {
        "Traceback", "KeyError", "ValueError", "TypeError",
        "AttributeError", "FileNotFoundError", "Exception",
        "Error:", "FAILED", "failed"
    };
    
    for (const auto& indicator : error_indicators) {
        if (content.find(indicator) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

bool TransientFilter::checkInstallationPatterns(const std::string& content) const {
    // Check for package installation indicators
    const std::vector<std::string> install_indicators = {
        "npm install", "npm WARN", "npm ERR",
        "pip install", "Collecting ", "Downloading ",
        "Installing collected", "Successfully installed",
        "Requirement already satisfied", "yarn install", "yarn add"
    };
    
    for (const auto& indicator : install_indicators) {
        if (content.find(indicator) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

bool TransientFilter::checkBuildPatterns(const std::string& content) const {
    // Check for build output indicators
    const std::vector<std::string> build_indicators = {
        "Build succeeded", "Build failed",
        "Compiling...", "Linking...", "Generating...",
        "Copying...", "Deleting...", "Cleaning...",
        "mkdir -p", "cp -r", "rm -rf"
    };
    
    for (const auto& indicator : build_indicators) {
        if (content.find(indicator) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

void TransientFilter::addPattern(const std::string& pattern) {
    pattern_strings_.push_back(pattern);
    
    try {
        patterns_.push_back(std::regex(pattern, std::regex::icase));
    } catch (const std::regex_error& e) {
        // Invalid pattern, remove from strings
        pattern_strings_.pop_back();
    }
}

void TransientFilter::removePattern(const std::string& pattern) {
    auto it = std::find(pattern_strings_.begin(), pattern_strings_.end(), pattern);
    if (it != pattern_strings_.end()) {
        size_t index = std::distance(pattern_strings_.begin(), it);
        pattern_strings_.erase(it);
        if (index < patterns_.size()) {
            patterns_.erase(patterns_.begin() + index);
        }
    }
}

std::vector<std::string> TransientFilter::getPatterns() const {
    return pattern_strings_;
}

} // namespace anchor
