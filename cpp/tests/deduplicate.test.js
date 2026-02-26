import koffi from 'koffi';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use .so for Linux, .dll for Windows. I am on Linux.
const libPath = path.join(__dirname, '../build/libanchor_core.so');

const lib = koffi.load(libPath);

const ffi = {
    deduplicator_create: lib.func('deduplicator_create', 'void *', ['double', 'int64']),
    deduplicator_destroy: lib.func('deduplicator_destroy', 'void', ['void *']),
    deduplicator_deduplicate: lib.func('deduplicator_deduplicate', 'string', ['void *', 'string'])
};

// Create deduplicator with strict config
const dedup = ffi.deduplicator_create(0.5, 5); // 0.5 geometric, 5 simhash distance

// Test case 1
const candidates = [
    {
        atom_id: 1,
        hop_distance: 1,
        shared_tags: 5,
        physical_bonus: 0.5,
        timestamp: 1234567890.0,
        simhash: 100,
        gravity_score: 0.9,
        content_fingerprints: ["hash1", "hash2"]
    },
    {
        atom_id: 2,
        hop_distance: 1,
        shared_tags: 5,
        physical_bonus: 0.5,
        timestamp: 1234567890.0,
        simhash: 101, // Duplicate
        gravity_score: 0.8,
        content_fingerprints: []
    }
];

const jsonIn = JSON.stringify(candidates);
console.log('Input 1:', jsonIn);

const jsonOut = ffi.deduplicator_deduplicate(dedup, jsonIn);
console.log('Output 1:', jsonOut);

const result = JSON.parse(jsonOut);

if (result.length !== 1) {
    console.error(`Test 1 Failed: Expected 1 candidate, got ${result.length}`);
    process.exit(1);
}

const item = result[0];
if (item.atom_id !== 1) {
    console.error(`Test 1 Failed: Expected atom_id 1, got ${item.atom_id}`);
    process.exit(1);
}

if (!item.content_fingerprints || item.content_fingerprints.length !== 2) {
    console.error(`Test 1 Failed: content_fingerprints mismatch.`);
    process.exit(1);
}

// Test case 2 (Stale data check)
const candidates2 = [
    {
        atom_id: 3,
        hop_distance: 1,
        shared_tags: 5,
        physical_bonus: 0.5,
        timestamp: 1234567890.0,
        simhash: 200,
        gravity_score: 0.9,
        content_fingerprints: []
    }
];
const jsonIn2 = JSON.stringify(candidates2);
console.log('Input 2:', jsonIn2);

const jsonOut2 = ffi.deduplicator_deduplicate(dedup, jsonIn2);
console.log('Output 2:', jsonOut2);

const result2 = JSON.parse(jsonOut2);

if (result2.length !== 1 || result2[0].atom_id !== 3) {
    console.error(`Test 2 Failed: Expected atom_id 3, got something else (maybe stale data?)`);
    console.error('Got:', result2);
    process.exit(1);
}

console.log('Test Passed!');

ffi.deduplicator_destroy(dedup);
