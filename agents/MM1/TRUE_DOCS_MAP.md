# True Documentation Map

This separates **in-use files** (agent data, logs, identity) from **documentation** (for humans to read/understand/update the system).

## 📊 Summary

**Total files found:** 815  
**After filtering (real docs):** ~50 files  
**After filtering (in-use data):** ~765 files

---

## ✅ Real Documentation (50 files)

### In default workspace

```
default/
├── anchor-engine-node/
│   ├── docs/
│   │   ├── design-patterns.md         ← REAL DOCS
│   │   ├── INSTALL.md                 ← REAL DOCS
│   │   ├── mcp-setup.md               ← REAL DOCS
│   │   ├── mcp-agent.md               ← REAL DOCS
│   │   ├── pglite-quick-reference.md  ← REAL DOCS
│   │   ├── star-algebra-reference.md  ← REAL DOCS
│   │   └── -settings-configs.md       ← REAL DOCS
│   ├── engine/
│   │   ├── docs/
│   │   │   └── MEMORY-PROFILING.md    ← REAL DOCS
│   │   ├── migrations/
│   │   │   └── INGESTION_UPDATE_GUIDE.md  ← REAL DOCS
│   └── Code Specialist Agent Profile.md  ← REAL DOCS
```

### In MM1 workspace (Memory Manager)

```
MM1/
├── README.md                          ← REAL DOCS
├── SETUP_SUMMARY.md                   ← REAL DOCS
├── find_docs.py                       ← REAL DOCS (self-documenting script)
├── map_docs.py                        ← REAL DOCS (self-documenting script)
└── run_memory_processor.sh            ← REAL DOCS (self-documenting)
```

### In MM1 skills (skill documentation)

```
MM1/skills/
├── pdf/reference.md                   ← REAL DOCS
├── himalaya/references/configuration.md  ← REAL DOCS
├── docx/scripts/office/schemas/...    ← NOT docs (actual implementation)
├── pptx/scripts/office/schemas/...    ← NOT docs (actual implementation)
└── xlsx/scripts/office/schemas/...    ← NOT docs (actual implementation)
```

### In JSA-1 skills

```
JSA-1/skills/
├── pdf/reference.md                   ← REAL DOCS
├── himalaya/references/configuration.md  ← REAL DOCS
└── ... (rest are implementations)
```

### In P1 workspace

```
P1/skills/
├── pdf/reference.md                   ← REAL DOCS
└── himalaya/references/configuration.md  ← REAL DOCS
```

### In ResearchAgent workspace

```
ResearchAgent/
├── README.md                          ← REAL DOCS
├── sessions/console/*.json            ← NOT docs (actual session data)
└── browser/user_data/Default/README  ← NOT docs (browser artifact)
```

### In default anchor-engine-node

```
default/anchor-engine-node/
├── browser/user_data/Default/README  ← NOT docs (browser artifact)
└── engine/context/context/README.md  ← NOT docs (internal implementation)
```

---

## 🚫 NOT Documentation (765 files)

### 1. In-Use Agent Identity Files (NOT docs)
These are **active data** the agent uses, not documentation for humans:

```
Every agent workspace has these:
- AGENTS.md         ← IN-USE (agent identity)
- MEMORY.md         ← IN-USE (agent memory)
- PROFILE.md        ← IN-USE (agent profile)
- SOUL.md           ← IN-USE (agent identity)
- BOOTSTRAP.md      ← IN-USE (agent identity)
- HEARTBEAT.md      ← IN-USE (agent identity)
- agent.json        ← IN-USE (agent config)
```

### 2. Session/Channel Logs (NOT docs)

```
QwenPaw_QA_Agent_0.2/sessions/console/*.json
MM1/sessions/*.json
ResearchAgent/sessions/console/*.json
P1/memory/2026-05-25.md
default/dialog/*.jsonl
```

### 3. Skill Implementations (NOT docs)

```
MM1/skills/
JSA-1/skills/
P1/skills/
QwenPaw_QA_Agent_0.2/skills/
```
These are **code**, not documentation about code.

### 4. File Store Data (NOT docs)

```
MM1/file_store/memory_chunks.jsonl
MM1/file_store/memory_file_metadata.json
AEN-1/file_store/memory_chunks.jsonl
P1/file_store/memory_chunks.jsonl
```

### 5. Node Modules (NOT docs)

```
default/anchor-engine-node/engine/node_modules/*
```
These are third-party dependencies, not documentation.

---

## 🎯 Recommendation

**Keep it simple:**

1. **In-use data stays where it is** - agent identity, session logs, file store data
2. **Real documentation goes in a central `docs/` folder**:
   ```
   C:\Users\rsbii\.qwenpaw\workspaces\default\docs\
   ├── agents/                    # Agent documentation
   │   ├── memory-manager.md
   │   ├── qa-agent.md
   │   └── job-search-agent.md
   ├── tools/                     # Tool documentation
   │   ├── multi-agent-session-processor.md
   │   ├── anchor-distillation-tool.md
   │   └── browser-use-tool.md
   ├── anchor-engine/             # Anchor engine docs
   │   ├── design-patterns.md
   │   ├── INSTALL.md
   │   └── ... (existing docs)
   └── skills/                    # Skill documentation
       ├── pdf-reference.md
       └── himalaya-configuration.md
   ```

3. **The files we just created** (find_docs.py, map_docs.py) could either:
   - Stay in MM1 as self-documenting tools
   - Move to `default/docs/tools/` if you want them discoverable by humans

**This is your current reality:**
- **50 real documentation files** - scattered but findable
- **765 in-use data files** - exactly where they need to be
- **No central documentation hub** - that's the gap we're filling

What would you like to do with the documentation we've created?
