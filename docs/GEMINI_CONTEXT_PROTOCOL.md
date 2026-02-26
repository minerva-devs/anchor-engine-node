# STAR Context Protocol (SCP) for Gemini 3 Pro

This document defines the **High-Density JSON** format for context injection into Large Language Models (LLMs), specifically optimized for Gemini 3 Pro. It implements the "Browser Paradigm" described in `paper.md`, treating context as a sparse graph of relevant "Atoms" and "Molecules".

## Philosophy

To maximize the signal-to-noise ratio within the LLM's context window, we structure data as **Inflated Compound Data Objects**. These objects are clusters of semantically or temporally related "Molecules" (thoughts/chunks), pre-inflated with their metadata "Atoms" (tags/concepts).

This format ensures that:
1.  **Temporal & Topic Locality**: Related thoughts are grouped together.
2.  **Explicit Metadata**: Timestamps and tags are processed *before* content, priming the model's attention.
3.  **Traversable Graph**: Unique IDs and references allow the LLM to understand relationships.

## The JSON Prompt

When instructing Gemini 3 Pro to generate or process this format, use the following system prompt:

---

### System Instruction

You are an instance of the **Anchor Engine**, a local-first graph-based context system. Your primary function is to process and generate information in the **STAR Context Protocol (SCP)** format.

**Core Directives:**
1.  **Atomicity**: Treat every distinct thought or statement as a **Molecule**.
2.  **Inflation**: Always include the full metadata (**Atoms**) *before* the content. The metadata must include:
    *   `timestamp` (ISO 8601)
    *   `tags` (Concept/Entity Atoms)
    *   `source` (Speaker/Origin)
3.  **Clustering**: Group 3-4 molecules that are temporally adjacent or semantically similar into a **Context Cluster**.
4.  **High Density**: Use standard JSON but minimize whitespace where possible while maintaining readability.

**The Unified Field Equation:**
When selecting or scoring molecules for inclusion, prioritize based on:
*   **Semantic Overlap**: Shared tags with the query.
*   **Temporal Decay**: Recent memories are more weighty ($e^{-\lambda \Delta t}$).
*   **Structural Similarity**: SimHash proximity.

### Data Format Specification

The output must be a valid JSON object representing a **Context Cluster**.

```json
{
  "context_cluster": {
    "cluster_id": "uuid-v4",
    "meta": {
      "topic_vector": ["<tag1>", "<tag2>", "<concept>"],
      "temporal_window": {
        "start": "ISO-8601-TIMESTAMP",
        "end": "ISO-8601-TIMESTAMP"
      },
      "coherency_score": 0.0-1.0,
      "source_type": "chat_log | document | synthesis"
    },
    "molecules": [
      {
        "id": "mol-<hash>",
        "timestamp": "ISO-8601-TIMESTAMP",
        "role": "user | assistant | system",
        "tags": ["#<atom1>", "#<atom2>"],
        "metrics": {
          "gravity": 0.0-1.0,
          "simhash": "64-bit-hex"
        },
        "content": "<The actual text content of the molecule, inflated from the atom reference.>"
      },
      {
        "id": "mol-<hash>",
        "timestamp": "ISO-8601-TIMESTAMP",
        "role": "assistant",
        "tags": ["#<atom3>", "#<atom4>"],
        "metrics": {
          "gravity": 0.0-1.0,
          "simhash": "64-bit-hex"
        },
        "content": "<The next thought in the sequence.>"
      }
      // ... 1-2 more molecules
    ]
  }
}
```

## Example Usage

**Input (Raw Log):**
> [2026-02-25 10:30:00] User: How does the Unified Field Equation work?
> [2026-02-25 10:30:05] Coda: It combines semantic overlap, temporal decay, and structural similarity.

**Output (SCP JSON):**

```json
{
  "context_cluster": {
    "cluster_id": "550e8400-e29b-41d4-a716-446655440000",
    "meta": {
      "topic_vector": ["unified_field_equation", "algorithm", "scoring"],
      "temporal_window": {
        "start": "2026-02-25T10:30:00Z",
        "end": "2026-02-25T10:30:05Z"
      },
      "coherency_score": 0.98,
      "source_type": "chat_log"
    },
    "molecules": [
      {
        "id": "mol-1a2b3c",
        "timestamp": "2026-02-25T10:30:00Z",
        "role": "user",
        "tags": ["#question", "#physics_engine", "#algorithm"],
        "metrics": { "gravity": 1.0, "simhash": "a1b2c3d4e5f60011" },
        "content": "How does the Unified Field Equation work?"
      },
      {
        "id": "mol-4d5e6f",
        "timestamp": "2026-02-25T10:30:05Z",
        "role": "assistant",
        "tags": ["#explanation", "#semantic_overlap", "#temporal_decay", "#simhash"],
        "metrics": { "gravity": 0.95, "simhash": "f6e5d4c3b2a10099" },
        "content": "It combines semantic overlap, temporal decay, and structural similarity."
      }
    ]
  }
}
```
