/**
 * @file file_utils.cpp
 * @brief File I/O utilities implementation
 */

#include "file_utils.h"
#include <fstream>
#include <sstream>
#include <filesystem>

namespace anchor {

std::optional<std::string> readFile(const std::string& path) {
    try {
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            return std::nullopt;
        }
        
        std::stringstream buffer;
        buffer << file.rdbuf();
        return buffer.str();
    } catch (...) {
        return std::nullopt;
    }
}

bool writeFile(const std::string& path, const std::string& content) {
    try {
        std::ofstream file(path, std::ios::binary);
        if (!file.is_open()) {
            return false;
        }
        file << content;
        return file.good();
    } catch (...) {
        return false;
    }
}

bool fileExists(const std::string& path) {
    try {
        return std::filesystem::exists(path);
    } catch (...) {
        return false;
    }
}

size_t getFileSize(const std::string& path) {
    try {
        return std::filesystem::file_size(path);
    } catch (...) {
        return 0;
    }
}

std::optional<std::string> readFileRange(
    const std::string& path,
    size_t start,
    size_t end
) {
    try {
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            return std::nullopt;
        }
        
        size_t length = end - start;
        std::string buffer(length, '\0');
        
        file.seekg(start);
        file.read(&buffer[0], length);
        
        if (!file.good() && !file.eof()) {
            return std::nullopt;
        }
        
        // Resize to actual bytes read
        buffer.resize(file.gcount());
        return buffer;
    } catch (...) {
        return std::nullopt;
    }
}

size_t findParagraphBoundaryBefore(
    const std::string& content,
    size_t pos
) {
    if (pos == 0 || pos > content.size()) {
        return 0;
    }
    
    // Search backwards for paragraph boundary
    // Look for double newline or start of file
    size_t search_start = (pos > 1000) ? pos - 1000 : 0;
    
    for (size_t i = pos - 1; i > search_start; i--) {
        // Check for double newline (paragraph boundary)
        if (i > 0 && content[i] == '\n' && content[i-1] == '\n') {
            return i + 1;  // Return position after the double newline
        }
        
        // Check for single newline at start of line
        if (i > 0 && content[i] == '\n' && (i == 1 || content[i-2] == '\n')) {
            return i + 1;
        }
    }
    
    // No boundary found, return search start
    return search_start;
}

size_t findParagraphBoundaryAfter(
    const std::string& content,
    size_t pos
) {
    if (pos >= content.size()) {
        return content.size();
    }
    
    // Search forwards for paragraph boundary
    // Look for double newline or end of file
    size_t search_end = std::min(pos + 1000, content.size());
    
    for (size_t i = pos; i < search_end; i++) {
        // Check for double newline (paragraph boundary)
        if (i + 1 < content.size() && content[i] == '\n' && content[i+1] == '\n') {
            return i + 2;  // Return position after the double newline
        }
    }
    
    // No boundary found, return search end
    return search_end;
}

std::string getDirectory(const std::string& path) {
    try {
        return std::filesystem::path(path).parent_path().string();
    } catch (...) {
        return ".";
    }
}

std::string joinPath(const std::string& directory, const std::string& filename) {
    try {
        return (std::filesystem::path(directory) / filename).string();
    } catch (...) {
        return directory + "/" + filename;
    }
}

} // namespace anchor
