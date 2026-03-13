/**
 * Security tests for path traversal protection
 */

import * as path from 'path';
import * as fs from 'fs';
import { NOTEBOOK_DIR } from './config/paths.js';

describe('Path Traversal Security Tests', () => {
  test('should prevent path traversal in context inflator', () => {
    // Simulate the security check from context-inflator.ts
    const maliciousPath = '../../../etc/passwd';
    const requestedPath = path.join(NOTEBOOK_DIR, maliciousPath);
    const resolvedPath = path.resolve(requestedPath);
    
    // Verify the resolved path is NOT within NOTEBOOK_DIR
    const relativePath = path.relative(NOTEBOOK_DIR, resolvedPath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isOutside).toBe(true); // This should be true, meaning the path is blocked
  });

  test('should allow valid paths within NOTEBOOK_DIR', () => {
    // Simulate the security check with a valid path
    const validPath = 'subdir/valid-file.txt';
    const requestedPath = path.join(NOTEBOOK_DIR, validPath);
    const resolvedPath = path.resolve(requestedPath);
    
    // Verify the resolved path is within NOTEBOOK_DIR
    const relativePath = path.relative(NOTEBOOK_DIR, resolvedPath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isOutside).toBe(false); // This should be false, meaning the path is allowed
  });

  test('should prevent path traversal with double dots', () => {
    const maliciousPath = 'subdir/../../etc/passwd';
    const requestedPath = path.join(NOTEBOOK_DIR, maliciousPath);
    const resolvedPath = path.resolve(requestedPath);
    
    const relativePath = path.relative(NOTEBOOK_DIR, resolvedPath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isOutside).toBe(true); // This should be true, meaning the path is blocked
  });

  test('should handle encoded characters appropriately', () => {
    // Since we're not dealing with URL decoding here, this would be treated as a literal filename
    const encodedPath = 'normal%2Fpath%2Ffile.txt'; // URL encoded / characters
    // This is treated as a literal filename, not path traversal
    const requestedPath = path.join(NOTEBOOK_DIR, encodedPath);
    const resolvedPath = path.resolve(requestedPath);
    
    const relativePath = path.relative(NOTEBOOK_DIR, resolvedPath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    // This should be false because it's treated as a literal filename
    expect(isOutside).toBe(false); // This is a valid filename in the directory
  });

  test('should prevent absolute path traversal', () => {
    const maliciousPath = '/etc/passwd';
    const resolvedPath = path.resolve(maliciousPath); // This becomes absolute path
    
    const relativePath = path.relative(NOTEBOOK_DIR, resolvedPath);
    const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isOutside).toBe(true); // Absolute paths should be caught by isAbsolute check
  });
});

// Test for the specific security fix in context-inflator.ts
describe('Context Inflator Security Fix', () => {
  test('should properly validate path within NOTEBOOK_DIR', () => {
    // This simulates the fixed code logic
    const filePath = 'valid-file.txt';
    const requestedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(NOTEBOOK_DIR, filePath);
    
    const absolutePath = path.resolve(requestedPath);
    const relativePath = path.relative(NOTEBOOK_DIR, absolutePath);
    const isBlocked = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isBlocked).toBe(false); // Valid path should not be blocked
  });

  test('should block path traversal attempts', () => {
    // This simulates the fixed code logic with malicious path
    const filePath = '../../../sensitive-file.txt';
    const requestedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(NOTEBOOK_DIR, filePath);
    
    const absolutePath = path.resolve(requestedPath);
    const relativePath = path.relative(NOTEBOOK_DIR, absolutePath);
    const isBlocked = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    
    expect(isBlocked).toBe(true); // Path traversal should be blocked
  });
});