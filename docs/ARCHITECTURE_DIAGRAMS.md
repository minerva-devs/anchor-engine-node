# Anchor Engine Architecture Diagrams

**Audience:** Human readers (developers, researchers, users)  
**Purpose:** Visual system understanding  
**Last Updated:** February 23, 2026

---

## System Overview

```mermaid
flowchart TB
    subgraph UI["User Interface"]
        A[Web Browser<br/>http://localhost:3160]
    end

    subgraph API["HTTP API Layer<br/>Express.js Port 3160"]
        B[Routes /v1/*]
        C[Middleware<br/>Auth/Validation]
    end

    subgraph SERVICES["Core Services"]
        D[Ingestion Service]
        E[Search Service<br/>STAR Algorithm]
        F[Watchdog Service<br/>File Monitoring]
        G[Mirror Protocol<br/>Filesystem Sync]
    end

    subgraph NATIVE["Native Modules<br/>@rbalchii/* N-API"]
        H[Atomizer<br/>Text Splitting]
        I[Fingerprint<br/>SimHash]
        J[KeyAssassin<br/>Keyword Extraction]
    end

    subgraph STORAGE["Storage Layer"]
        K[(PGlite Database<br/>Disposable Index)]
        L[mirrored_brain/<br/>Source of Truth]
        M[inbox/<br/>external-inbox/<br/>Filesystem]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    
    D --> H
    D --> I
    E --> I
    E --> J
    
    D --> K
    D --> L
    E --> K
    E --> L
    F --> M
    G --> L
    G --> M

    style K fill:#ffebee,stroke:#c62828
    style L fill:#e8f5e9,stroke:#2e7d32
    style M fill:#e3f2fd,stroke:#1565c0
```

**Key Components:**

1. **UI Layer** - React/Vite frontend at http://localhost:3160
2. **HTTP API** - Express.js REST API on port 3160
3. **Core Services** - Ingestion, Search (STAR), Watchdog, Mirror
4. **Native Modules** - C++ N-API for performance (@rbalchii/* packages)
5. **Storage** - PGlite database (disposable) + mirrored_brain/ (persistent)

---

## Data Model: Compound → Molecule → Atom

```mermaid
flowchart LR
    subgraph FILESYSTEM["Filesystem<br/>Source of Truth"]
        A["ChatSessions.yaml<br/>91.88MB"]
        B["mirrored_brain/<br/>Plain Text Files"]
    end

    subgraph DATABASE["PGlite Index<br/>Pointers Only"]
        C["Compound<br/>File Reference"]
        D["Molecule<br/>Byte Offsets<br/>start: 1024<br/>end: 2048"]
        E["Atom<br/>Tags Only<br/>No Content"]
    end

    A -->|Mirror Protocol| B
    B -->|Atomize| C
    C -->|Contains| D
    D -->|Tagged With| E

    style FILESYSTEM fill:#e1f5ff,stroke:#1976d2
    style DATABASE fill:#fff4e1,stroke:#f57c00
```

**Key Insight:** Content lives in `mirrored_brain/` filesystem. Database stores **pointers only** (byte offsets + tags), making it **disposable and rebuildable**.

---

## STAR Search Algorithm Flow

```mermaid
flowchart TB
    A[User Query<br/>Coda C-001 Rob Dory] --> B{Budget Check<br/>max_chars > 65k?}

    B -->|No| C[Standard Search<br/>70/30 Budget<br/>1-hop<br/>Temporal Decay]
    B -->|Yes| D[Max-Recall Search<br/>Zero Decay<br/>3-hop<br/>200 nodes/hop]

    C --> E[Query Parsing<br/>NLP + Key Terms]
    D --> E

    E --> F[Parallel Searches<br/>5 Sub-queries<br/>4-word chunks]

    F --> G[Merge & Deduplicate<br/>60 Atoms]

    G --> H{Max-Recall?}
    H -->|Yes| I[Context Inflation<br/>n-1, n+1 from Disk<br/>8550 chars/atom]
    H -->|No| J[Return Results<br/>16k-32k chars]

    I --> K[Serialize Context<br/>512k-618k chars]
    J --> K

    K --> L[Return to User]

    style D fill:#ffeb3b,stroke:#f57f17
    style I fill:#ffeb3b,stroke:#f57f17
    style K fill:#c8e6c9,stroke:#2e7d32
```

**Unified Field Equation:**
```
Gravity = (SharedTags) × e^(-λΔt) × (1 - SimHashDistance/64)
```

---

## Deduplication Pipeline (5-Layer)

```mermaid
flowchart TB
    A[Raw Results<br/>44 Items] --> B[Sort by Score]
    B --> C{Has Content<br/>&& >20 chars?}
    
    C -->|No| D[Keep]
    C -->|Yes| E[1. Geometric Dedup<br/>50% Overlap]
    
    E --> F{Duplicate?}
    F -->|Yes| G[Skip]
    F -->|No| H[2. MD5 Fingerprint<br/>First 500 Chars]
    
    H --> I{Duplicate?}
    I -->|Yes| G
    I -->|No| J[3. Containment<br/>Substring Match]
    
    J --> K{Duplicate?}
    K -->|Yes| G
    K -->|No| L[4. Fuzzy Prefix<br/>50-100 Chars]
    
    L --> M{Duplicate?}
    M -->|Yes| G
    M -->|No| N[5. SimHash Distance<br/>Hamming < 5]
    
    N --> O{Duplicate?}
    O -->|Yes| G
    O -->|No| P[Keep<br/>Register Range]
    
    P --> Q{More?}
    Q -->|Yes| C
    Q -->|No| R[Final: 33 Items<br/>25% Dedup Rate]

    style N fill:#ffeb3b,stroke:#f57f17
    style R fill:#c8e6c9,stroke:#2e7d32
```

**Dedup Layers:**
1. **Geometric** - Same-file overlapping windows
2. **Content Fingerprint** - Cross-file exact duplicates (MD5)
3. **Containment** - One result is subset of another
4. **Fuzzy Prefix** - Near-exact with whitespace/timestamp diffs
5. **SimHash Distance** - Cross-file near-duplicates (NEW v4.1.2)

---

## Context Inflation: n-1, n+1 Expansion

```mermaid
flowchart LR
    subgraph BEFORE["Before Inflation<br/>60 × 222 chars = 13k"]
        A["Match Point<br/>'Rob Dory'<br/>222 chars"]
    end

    subgraph INFLATE["Inflation Process"]
        B[Read Full File<br/>from mirrored_brain/]
        C[Extract ±7,864 chars<br/>Around Match]
        D[Replace Content<br/>With Expanded]
    end

    subgraph AFTER["After Inflation<br/>60 × 8,550 chars = 513k"]
        E["Full Context<br/>Paragraphs Before/After<br/>8,550 chars"]
    end

    A --> B --> C --> D --> E

    style BEFORE fill:#ffebee,stroke:#c62828
    style INFLATE fill:#f0f0f0,stroke:#666
    style AFTER fill:#c8e6c9,stroke:#2e7d32
    style E fill:#4caf50,color:#fff
```

**Impact:** 13k chars → 513k chars (39x increase)

---

## Time Ordering Toggle

```mermaid
flowchart LR
    A[Search Results] --> B{Sort Mode?}
    
    B -->|Chronological| C[Sort by Timestamp<br/>Oldest First]
    B -->|Relevance| D[Sort by Score<br/>Highest First]
    
    C --> E[Causal Narrative<br/>Code v1 → Error → Code v2]
    D --> F[Associative Discovery<br/>Most Relevant First]
    
    style C fill:#4caf50,color:#fff
    style D fill:#7c3aed,color:#fff
    style E fill:#e8f5e9,stroke:#2e7d32
    style F fill:#ede7f6,stroke:#7b1fa2
```

**UI Toggle:** 📅 Chronological (green) ↔ 🎯 Relevance (purple)

---

## Ingestion Pipeline

```mermaid
flowchart TB
    A[File Added<br/>inbox/external-inbox/] --> B[Watchdog Detects]
    B --> C{Transient Data?}
    
    C -->|Yes| D[Skip Ingestion<br/>Error Logs, npm install]
    C -->|No| E[Sanitize<br/>KeyAssassin]
    
    E --> F[Generate SimHash<br/>Fingerprint]
    F --> G[Split into Molecules<br/>Semantic Boundaries]
    
    G --> H[Extract Tags<br/>TF-IDF + Synonyms]
    H --> I[Store in PGlite<br/>Pointers Only]
    
    I --> J[Mirror to<br/>mirrored_brain/]
    J --> K[Generate Synonyms<br/>Background]
    
    style C fill:#ffeb3b,stroke:#f57f17
    style D fill:#ffebee,stroke:#c62828
    style J fill:#e8f5e9,stroke:#2e7d32
```

**Transient Filter Patterns:**
- Terminal error logs (Traceback, KeyError)
- Package installation (npm install, pip install)
- Build artifacts (Build succeeded, Compiling...)

---

## Phoenix Protocol: Backup/Restore

```mermaid
flowchart TB
    subgraph BACKUP["Backup Process"]
        A[User: 💾 Eject Memory]
        B[Export Database<br/>atoms, sources, engrams]
        C[Aggregate by Source]
        D[Write JSON<br/>backups/backup_TIMESTAMP.json]
    end

    subgraph RESTORE["Restore Process"]
        E[User: Select Backup]
        F[Wipe Database<br/>Clean Slate]
        G[Restore Tables<br/>atoms, sources, engrams]
        H[Rebuild Filesystem<br/>inbox/, external-inbox/]
        I[Verify Integrity<br/>Count Match]
    end

    A --> B --> C --> D
    E --> F --> G --> H --> I

    style BACKUP fill:#e3f2fd,stroke:#1976d2
    style RESTORE fill:#fff3e0,stroke:#f57f17
    style H fill:#ffeb3b,stroke:#f57f17
```

**Key Feature:** Rebuilds **both** database AND filesystem structure from backup.

---

## Memory Management

```mermaid
flowchart LR
    A[Startup<br/>~500MB RSS] --> B{Large File<br/>Ingestion?}
    
    B -->|Yes 90MB+| C[Peak Memory<br/>~1.6GB RSS<br/>Standard 109 Batching]
    B -->|No| D[Steady State<br/>~500MB RSS]
    
    C --> E[Idle Timeout<br/>5 Minutes]
    D --> E
    
    E --> F[Garbage Collection<br/>~650MB RSS<br/>60% Reduction]

    style C fill:#ffeb3b,stroke:#f57f17
    style F fill:#c8e6c9,stroke:#2e7d32
```

**Standard 109 Batching Benefits:**
- No hangs on 90MB+ files
- Progress logging every 5%
- Event loop yielding prevents UI freezing
- Automatic garbage collection hints

---

## Performance Benchmarks

```mermaid
xychart-beta
    title "Search Latency by Strategy"
    x-axis ["Standard", "Max-Recall"]
    y-axis "Latency (ms)" 0 --> 60000
    bar [300, 50000]
```

```mermaid
xychart-beta
    title "Context Retrieval Volume"
    x-axis ["Standard", "Max-Recall"]
    y-axis "Characters (k)" 0 --> 700
    bar [32, 618]
```

```mermaid
xychart-beta
    title "Deduplication Effectiveness"
    x-axis ["Before v4.1.2", "After v4.1.2"]
    y-axis "Dedup Rate (%)" 0 --> 60
    bar [30, 45]
```

---

## See Also

- **specs/spec.md** - Technical specification (LLM-optimized)
- **docs/whitepaper.md** - STAR Algorithm whitepaper
- **specs/standards/STANDARD_117_ARXIV_SUBMISSION.md** - arXiv submission workflow
- **specs/standards/RESEARCH_LANDSCAPE.md** - Related work analysis

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node  
**License:** AGPL-3.0  
**Production Verified:** February 23, 2026
