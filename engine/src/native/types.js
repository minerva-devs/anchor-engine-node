/**
 * Type definitions for @rbalchii/anchor-core
 * Note: These are JSDoc type hints for IDE support
 */

/**
 * @typedef {Object} Atom
 * @property {number} id
 * @property {string} source_id
 * @property {string} content
 * @property {number} char_start
 * @property {number} char_end
 * @property {number} timestamp
 * @property {bigint} simhash
 * @property {string[]} [tags]
 * @property {string[]} [buckets]
 * @property {string} [compound_id]
 * @property {number} [start_byte]
 * @property {number} [end_byte]
 */

/**
 * @typedef {Object} Candidate
 * @property {number} atom_id
 * @property {number} score
 * @property {number} shared_tags
 * @property {number} hop_distance
 * @property {bigint} [simhash]
 * @property {number} [temporal_decay]
 */

/**
 * @typedef {Object} DatabaseStats
 * @property {number} atom_count
 * @property {number} source_count
 * @property {number} tag_count
 */

/**
 * @typedef {Object} SearchOptions
 * @property {number} [limit]
 * @property {string[]} [buckets]
 * @property {string[]} [tags]
 * @property {'internal'|'external'|'quarantine'|'all'} [provenance]
 */

/**
 * @typedef {Object} PhysicsWalkerConfig
 * @property {number} [damping]
 * @property {number} [temporalDecay]
 * @property {number} [walkRadius]
 * @property {number} [gravityThreshold]
 */

/**
 * @typedef {Object} ContextInflatorConfig
 * @property {number} [baseRadius]
 * @property {boolean} [expandToParagraphs]
 * @property {number} [maxChars]
 */

// Empty export to make this a module
export {};
