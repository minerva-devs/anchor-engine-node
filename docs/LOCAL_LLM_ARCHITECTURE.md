# Local LLM + Anchor Engine Architecture

**Target:** Pixel 8 (8GB RAM) | **Model:** Qwen 2.5 2B (4-6bit quantized) | **Runtime:** MNN

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Qwen Code CLI  │  │  Custom Agent   │  │   Web UI        │ │
│  │  (A/B Test A)   │  │  Harness (B)    │  │  (Future)       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   MCP Server (stdio)    │
                    │  Port: N/A (stdin/out)  │
                    └────────────┬────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
   ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
   │  Anchor Engine  │  │  MNN Inference │  │  Chat Log      │
   │  Port: 3160     │  │  Server        │  │  Manager       │
   │  Long-term Mem  │  │  Port: 8080    │  │  Short-term    │
   │  314K+ atoms    │  │  Qwen 2.5 2B   │  │  12K chars     │
   └─────────────────┘  └────────────────┘  └────────────────┘
```

---

## Component Specifications

### 1. Anchor Engine (Long-Term Memory)
- **Port:** 3160
- **Memory:** ~400MB RSS (with 6GB max-old-space)
- **Role:** Semantic search, knowledge retrieval, context inflation
- **API:** `POST /v1/memory/search`, `POST /v1/memory/explore`, `POST /v1/memory/distill`
- **MCP Tools:** `anchor_query`, `anchor_distill`, `anchor_illuminate`, `anchor_read_file`

### 2. MNN Inference Server (Model Runtime)
- **Port:** 8080
- **Model:** Qwen 2.5 2B (Q4_K_M or Q6_K quantized)
- **Memory:** ~2-3GB RAM (2B @ 4-bit = ~1GB + overhead)
- **API:** OpenAI-compatible `/v1/chat/completions`
- **Context:** 4K-8K tokens (configurable)

### 3. Chat Log Manager (Short-Term Memory)
- **Format:** Markdown with frontmatter
- **Location:** `~/chat_logs/current_session.md`
- **Size Limit:** 12,000 characters (~5,000 lines)
- **Rotation:** Auto-archive to `~/chat_logs/archive/YYYY-MM-DD_HH-mm-ss.md`
- **Structure:**
  ```markdown
  ---
  session_id: uuid
  started: 2026-03-14T21:00:00Z
  model: qwen-2.5-2b-q4
  anchor_queries: 5
  ---
  
  ## User
  [prompt text]
  
  ## Assistant  
  [response text]
  
  ## Thinking
  [reasoning block if any]
  
  ---
  ```

### 4. Agent Harness (Orchestration Layer)
- **Role:** Tool calling, state management, prompt construction
- **Tools:**
  - `search_anchor(query, max_results)` → Anchor Engine MCP
  - `read_chat_log(lines)` → Local file read
  - `web_search(query)` → External API (optional)
  - `execute_command(cmd)` → Sandboxed shell (optional)
- **Prompt Template:**
  ```
  System: You are a coding assistant with access to:
  1. Long-term memory via Anchor Engine search
  2. Recent conversation history (last 12K chars)
  
  Current date: {date}
  
  Recent conversation:
  {chat_log_content}
  
  Retrieved context (if any):
  {anchor_results}
  
  User: {user_prompt}
  Assistant:
  ```

---

## Data Flow

### Query Processing Pipeline

```
1. User Input
   │
   ▼
2. Chat Log Manager
   ├── Append user prompt to current_session.md
   ├── Check if rotation needed (>12K chars)
   │   └── If yes: archive + create new file
   │
   ▼
3. Agent Harness
   ├── Parse prompt for search intent
   ├── Call anchor_query if needed
   │   └── Get top N results with scores
   │
   ▼
4. Prompt Construction
   ├── Load last 12K chars from chat log
   ├── Inject anchor results (if any)
   └── Build final prompt with system message
   │
   ▼
5. MNN Inference (Port 8080)
   ├── POST /v1/chat/completions
   ├── Stream response tokens
   └── Capture thinking blocks (if any)
   │
   ▼
6. Response Handling
   ├── Append assistant response to chat log
   ├── Extract action items / code blocks
   └── Return to user
```

---

## Memory Management

### Token Budget Strategy

| Component | Token Budget | Purpose |
|-----------|-------------|---------|
| **System Prompt** | ~200 tokens | Role, instructions, date |
| **Chat Log (12K chars)** | ~3,000 tokens | Recent conversation context |
| **Anchor Results** | ~500-1,000 tokens | Retrieved long-term memory |
| **User Prompt** | ~500 tokens | Current query |
| **Response Buffer** | ~1,000 tokens | Generation headroom |
| **Total** | ~5,200 tokens | Within 8K context window |

### Anchor Engine Integration Options

**Option A: Direct MCP Tool Calls (Recommended)**
- Model calls `anchor_query` via MCP when it needs context
- Results injected into next prompt
- Pros: Model decides when to search, token-efficient
- Cons: Requires MCP-compatible client

**Option B: Pre-fetch Search Results**
- Agent harness parses prompt, auto-triggers search
- Results always included in prompt construction
- Pros: Works with any client, simpler
- Cons: May search unnecessarily, less model control

**Option C: Hybrid Approach**
- Harness does lightweight keyword extraction
- Auto-searches if confidence > threshold
- Model can still request additional searches via MCP
- Pros: Best of both worlds
- Cons: More complex implementation

---

## Implementation Plan

### Phase 1: MNN Setup (Priority 1)
```bash
# Install MNN for Android
pkg install mnn

# Download Qwen 2.5 2B quantized
# Recommended: Q4_K_M (best quality/size balance)
wget https://huggingface.co/Qwen/Qwen2.5-2B-Instruct-GGUF/resolve/main/qwen2.5-2b-instruct-q4_k_m.gguf

# Start MNN server on port 8080
mnn-server --model qwen2.5-2b-instruct-q4_k_m.gguf \
           --port 8080 \
           --ctx-size 8192 \
           --threads 4
```

### Phase 2: Chat Log Manager
- Create `chat_log_manager.ts` with:
  - `appendEntry(role, content)` - Add user/assistant/thinking blocks
  - `getRecentChars(limit)` - Get last N characters
  - `rotateIfNeeded()` - Archive if >12K chars
  - `getSessionStats()` - Count queries, tokens, etc.

### Phase 3: Agent Harness
- Create `agent_harness.ts` with:
  - MCP client for Anchor Engine
  - Prompt template builder
  - Tool calling interface
  - Response streaming

### Phase 4: Integration Testing
- Test end-to-end on Pixel 8
- Measure memory usage, latency, token consumption
- A/B test Qwen Code vs custom harness

---

## Resource Estimates (Pixel 8)

| Component | RAM Usage | Notes |
|-----------|-----------|-------|
| **Anchor Engine** | 400-600MB | With 314K atoms, 6GB heap limit |
| **MNN (Qwen 2.5 2B Q4)** | 2-3GB | Model + KV cache + overhead |
| **MCP Server** | 50-100MB | Lightweight stdio transport |
| **Agent Harness** | 100-200MB | Node.js + tool handlers |
| **System + Buffer** | 1-2GB | Android OS + headroom |
| **Total** | ~4-5GB | Within 8GB limit ✅ |

---

## Next Steps

1. **Install MNN** and test Qwen 2.5 2B inference
2. **Build Chat Log Manager** with rotation logic
3. **Create Agent Harness** with MCP integration
4. **Test A/B** with Qwen Code client
5. **Add web search** tool (optional)
6. **Deploy and iterate** based on usage patterns
