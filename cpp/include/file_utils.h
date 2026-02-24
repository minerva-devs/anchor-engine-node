/**
 * @file file_utils.h
 * @brief File I/O utilities for Anchor Core
 */

#ifndef ANCHOR_CORE_FILE_UTILS_H
#define ANCHOR_CORE_FILE_UTILS_H

#include "types.h"
#include <string>
#include <optional>

namespace anchor {

/**
 * @brief Read entire file content
 * @param path File path
 * @return std::optional<std::string> File content or nullopt if error
 */
std::optional<std::string> readFile(const std::string& path);

/**
 * @brief Write content to file
 * @param path File path
 * @param content Content to write
 * @return true if successful
 */
bool writeFile(const std::string& path, const std::string& content);

/**
 * @brief Check if file exists
 * @param path File path
 * @return true if file exists
 */
bool fileExists(const std::string& path);

/**
 * @brief Get file size in bytes
 * @param path File path
 * @return File size or 0 if error
 */
size_t getFileSize(const std::string& path);

/**
 * @brief Read file range (byte offsets)
 * @param path File path
 * @param start Start byte offset
 * @param end End byte offset
 * @return File content in range or nullopt if error
 */
std::optional<std::string> readFileRange(
    const std::string& path,
    size_t start,
    size_t end
);

/**
 * @brief Find paragraph boundary before position
 * @param content File content
 * @param pos Current position
 * @return Position of paragraph boundary
 */
size_t findParagraphBoundaryBefore(
    const std::string& content,
    size_t pos
);

/**
 * @brief Find paragraph boundary after position
 * @param content File content
 * @param pos Current position
 * @return Position of paragraph boundary
 */
size_t findParagraphBoundaryAfter(
    const std::string& content,
    size_t pos
);

/**
 * @brief Get directory path from file path
 * @param path File path
 * @return Directory path
 */
std::string getDirectory(const std::string& path);

/**
 * @brief Join directory and filename
 * @param directory Directory path
 * @param filename Filename
 * @return Full path
 */
std::string joinPath(const std::string& directory, const std::string& filename);

} // namespace anchor

#endif // ANCHOR_CORE_FILE_UTILS_H
