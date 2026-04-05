# Bolt Memory Orchestrator Setup

## 🎯 Overview

The orchestrator is **model-agnostic** - you can choose your LLM provider via the UI or CLI.

## 🚀 Quick Start

### Option 1: Web UI (Recommended)

```bash
# Start bolt-memory (if not running)
cd /data/data/com.termux/files/home/projects/bolt-memory
pnpm start

# Open orchestrator UI in browser
# Navigate to: http://localhost:3161/orchestrator-ui.html
# Or open the file directly in your browser
```

### Option 2: CLI

```bash
# Using llama.cpp (default)
node orchestrator-v2.js "Your task here"

# Interactive chat mode
node orchestrator-v2.js --chat

# Use different provider
node orchestrator-v2.js --provider=ollama "Your task here"
```

## 🤖 Supported Providers

### 1. llama.cpp (Default ✅)
- **Model:** Qwen 3.5 2B Instruct (GGUF)
- **Location:** `/data/data/com.termux/files/home/models/qwen3.5-2b-instruct-q4_k_m.gguf`
- **Port:** 8080
- **Status:** ✅ Ready to use

### 2. Ollama
- **Setup:** Install from https://ollama.ai
- **Port:** 11434
- **Models:** Any Ollama model
- **Status:** ⚠️ Needs installation

### 3. LM Studio
- **Setup:** Download from https://lmstudio.ai
- **Port:** 1234
- **Models:** Any GGUF loaded in LM Studio
- **Status:** ⚠️ Needs installation

### 4. OpenAI Compatible
- **Setup:** Configure API key in `orchestrator-config.json`
- **Models:** GPT-3.5, GPT-4, or any compatible API
- **Status:** ⚠️ Needs API key

## ⚙️ Configuration

Edit `orchestrator-config.json`:

```json
{
  "orchestrator": {
    "default_provider": "llama_cpp",  // Change default provider
    "providers": {
      "llama_cpp": {
        "models": [
          {
            "name": "Qwen 3.5 2B",
            "path": "/path/to/model.gguf",
            "default": true
          }
        ]
      }
    }
  }
}
```

## 📊 Features

### Auto-Search Memory
- Automatically searches bolt-memory before responding
- Provides relevant context from past sessions
- Toggle on/off in UI

### Auto-Save Decisions
- Saves all tasks and responses to memory
- Tagged with session ID for easy retrieval
- Configurable in config file

### Checkpoint Distillation
- Creates distilled summary on session end
- Compresses conversation into key decisions
- Enables quick context restoration

## 🧪 Testing

### Test llama.cpp
```bash
node orchestrator-v2.js "Hello, can you help me with a task?"
```

### Test Memory Integration
```bash
node orchestrator-v2.js --chat
# Ask multiple questions, then exit
# Check memory: curl http://localhost:3161/v1/stats
```

### Test Provider Switching
```bash
# Switch to Ollama (if installed)
node orchestrator-v2.js --provider=ollama "What's 2+2?"
```

## 🎨 UI Features

The web UI (`orchestrator-ui.html`) provides:
- **Provider Selection:** Click to switch between LLM backends
- **Memory Stats:** Real-time database statistics
- **Task Input:** Describe your task
- **Auto-Search Toggle:** Enable/disable memory search
- **Response Display:** Formatted LLM responses
- **Auto-Save:** All interactions saved to memory

## 📝 Example Workflow

1. **Start bolt-memory**
   ```bash
   cd /data/data/com.termux/files/home/projects/bolt-memory
   pnpm start
   ```

2. **Open Orchestrator UI**
   - Navigate to `orchestrator-ui.html` in your browser
   - Select llama.cpp (already configured)
   - Check memory stats (should show your ingested chats)

3. **Ask a Question**
   ```
   "What were we discussing about agent checkpoint distillation?"
   ```

4. **Review Response**
   - LLM searches memory automatically
   - Finds relevant context from past sessions
   - Provides informed response
   - Saves interaction to memory

5. **Continue Later**
   - Next session: memory still available
   - Context preserved across restarts
   - Checkpoint distillation for quick summaries

## 🔧 Troubleshooting

### LLM Server Won't Start
```bash
# Check if model exists
ls -lh /data/data/com.termux/files/home/models/qwen3.5-2b-instruct-q4_k_m.gguf

# Check if port is in use
lsof -i :8080

# Kill existing process
pkill -f llama-server
```

### Memory Not Accessible
```bash
# Check bolt-memory is running
curl http://localhost:3161/health

# Restart if needed
pkill -f "node.*engine/dist/index.js"
pnpm start
```

### Provider Not Working
```bash
# Check provider status in UI
# Each provider card shows status indicator
# Green = Ready, Red = Offline, Yellow = Loading
```

## 📚 Next Steps

1. **Configure Your Preferred Provider** - Edit config file
2. **Test with Simple Tasks** - Verify integration works
3. **Use for Real Work** - Start orchestrating actual tasks
4. **Build Memory** - Interactions accumulate in bolt-memory
5. **Create Checkpoints** - Distill important sessions

---

**Last Updated:** 2026-03-20  
**Version:** 2.0.0 (Model-Agnostic)
