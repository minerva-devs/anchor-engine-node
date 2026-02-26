#include "../include/simhash.h"
#include <iostream>
#include <string>
#include <vector>
#include <stdexcept>

void check(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void test_simhash_deterministic() {
    std::string text = "this is a test string for simhash deterministic check";
    anchor::SimHash h1 = anchor::computeSimHash(text);
    anchor::SimHash h2 = anchor::computeSimHash(text);
    check(h1 == h2, "SimHash is not deterministic");
    std::cout << "test_simhash_deterministic passed" << std::endl;
}

void test_simhash_similar() {
    std::string text1 = "this is a test string for simhash similarity check";
    std::string text2 = "this is a test string for simhash similarity check too"; // Small change
    anchor::SimHash h1 = anchor::computeSimHash(text1);
    anchor::SimHash h2 = anchor::computeSimHash(text2);
    int dist = anchor::hammingDistance(h1, h2);
    // SimHash should have small hamming distance for similar texts
    // For small changes, distance is usually small (e.g., < 10)
    check(dist < 15, "SimHash similarity check failed: distance " + std::to_string(dist));
    std::cout << "test_simhash_similar passed: distance " << dist << std::endl;
}

void test_simhash_different() {
    std::string text1 = "completely different content about physics";
    std::string text2 = "total opposite topic regarding biology and chemistry";
    anchor::SimHash h1 = anchor::computeSimHash(text1);
    anchor::SimHash h2 = anchor::computeSimHash(text2);
    int dist = anchor::hammingDistance(h1, h2);
    // Different texts should have large hamming distance (around 32 on average for 64-bit hash)
    check(dist > 10, "SimHash difference check failed: distance " + std::to_string(dist));
    std::cout << "test_simhash_different passed: distance " << dist << std::endl;
}

void test_empty_string() {
    std::string text = "";
    anchor::SimHash h = anchor::computeSimHash(text);
    check(h == 0, "Empty string SimHash should be 0");
    std::cout << "test_empty_string passed" << std::endl;
}

int main() {
    std::cout << "Running SimHash tests..." << std::endl;
    try {
        test_simhash_deterministic();
        test_simhash_similar();
        test_simhash_different();
        test_empty_string();
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
    std::cout << "All SimHash tests passed!" << std::endl;
    return 0;
}
