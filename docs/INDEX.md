# Anchor Engine - Documentation Index

**Version:** 4.1.2 | **Updated:** February 22, 2026 | **Status:** ✅ Production Ready

---

## 📚 Quick Navigation

### Getting Started
- **[README.md](../README.md)** - Quick start, installation, API examples
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history (latest: v4.1.2 SimHash Dedup)

### Core Documentation
- **[docs/whitepaper.md](whitepaper.md)** - The Sovereign Context Protocol (95% compliance)
- **[docs/ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - System diagrams & flow charts
- **[specs/spec.md](../specs/spec.md)** - System specification

### Architecture Standards
- **[docs/standards/](standards/)** - Core architecture standards
  - **STANDARD_086** - Dual-Strategy Search (v2.0 with SimHash Dedup)
  - **STANDARD_113** - Automatic Max-Recall Trigger
  - **STANDARD_116** - Phoenix Protocol Backup/Restore

---

## 🎯 Documentation by Use Case

### "I want to install and run Anchor Engine"
→ Start with **[README.md](../README.md)** - Quick Start section

### "I need to understand how the system works"
→ Read **[docs/ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual flow charts

### "I'm researching the theory behind Anchor Engine"
→ Study **[docs/whitepaper.md](whitepaper.md)** - Academic paper

### "I need API documentation"
→ See **[README.md](../README.md)** - API Examples or **[specs/spec.md](../specs/spec.md)** - API Endpoints

### "I want to understand the search algorithm"
→ Read **[docs/standards/STANDARD_086_DUAL_STRATEGY_SEARCH.md](standards/STANDARD_086_DUAL_STRATEGY_SEARCH.md)**

### "How does max-recall mode work?"
→ See **[docs/standards/STANDARD_113_AUTOMATIC_MAX_RECALL.md](standards/STANDARD_113_AUTOMATIC_MAX_RECALL.md)**

### "How do I backup and restore my data?"
→ Follow **[docs/standards/STANDARD_116_PHOENIX_PROTOCOL.md](standards/STANDARD_116_PHOENIX_PROTOCOL.md)**

### "What's new in the latest version?"
→ Check **[CHANGELOG.md](../CHANGELOG.md)** - Latest: v4.1.2 SimHash Dedup Fix

---

## 📊 Key Metrics (v4.1.2)

| Metric | Value | Status |
|--------|-------|--------|
| **Context Retrieval** | 618k chars | ✅ +18% vs whitepaper |
| **Memory Peak** | 510MB | ✅ -70% vs whitepaper |
| **Search Latency** | 300ms standard, 50s max-recall | ⚠️ Trade-off for volume |
| **Ingestion Throughput** | 1,200 mol/sec | ✅ Verified |
| **Deduplication Rate** | 40-50% | ✅ NEW with SimHash |
| **Whitepaper Compliance** | 95% | ✅ Production Ready |

---

## 🗂️ Document Structure

```
anchor-engine-node/
├── README.md                      # Start here
├── CHANGELOG.md                   # What's new
│
├── docs/
│   ├── whitepaper.md              # Academic paper
│   ├── ARCHITECTURE_DIAGRAMS.md   # Visual diagrams
│   └── standards/
│       ├── STANDARD_086_DUAL_STRATEGY_SEARCH.md
│       ├── STANDARD_113_AUTOMATIC_MAX_RECALL.md
│       └── STANDARD_116_PHOENIX_PROTOCOL.md
│
├── specs/
│   ├── spec.md                    # System spec
│   ├── plan.md                    # Roadmap
│   └── standards/                 # Legacy standards
│
└── tests/
    └── whitepaper-verification.js # Test suite
```

---

## 🔬 Recent Updates (v4.1.2 - Feb 22, 2026)

### SimHash Deduplication Fix

**Problem:** Cross-file near-duplicate atoms were not being caught (25-35% dedup rate)

**Solution:** Added SimHash distance check (Hamming < 5 = near-duplicate)

**Impact:** Dedup rate improved to 40-50%

**Files Changed:**
- `engine/src/services/search/search.ts` - Added SimHash check
- `docs/standards/STANDARD_086_DUAL_STRATEGY_SEARCH.md` - Updated dedup strategy
- `docs/whitepaper.md` - Updated compliance to 95%

### New Documentation

- **ARCHITECTURE_DIAGRAMS.md** - Complete visual flow charts
- **STANDARD_086 v2.0** - Dual-strategy search with SimHash dedup
- **STANDARD_113** - Automatic max-recall trigger
- **STANDARD_116** - Phoenix Protocol backup/restore

---

## 🎓 Learning Path

### Beginner (Just Getting Started)
1. **[README.md](../README.md)** - Installation & first query
2. **[docs/ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - System overview
3. **[CHANGELOG.md](../CHANGELOG.md)** - Recent features

### Intermediate (Understanding the System)
1. **[specs/spec.md](../specs/spec.md)** - Full system specification
2. **[docs/standards/STANDARD_086_DUAL_STRATEGY_SEARCH.md](standards/STANDARD_086_DUAL_STRATEGY_SEARCH.md)** - Search algorithm
3. **[docs/standards/STANDARD_113_AUTOMATIC_MAX_RECALL.md](standards/STANDARD_113_AUTOMATIC_MAX_RECALL.md)** - Max-recall mode

### Advanced (Deep Dive)
1. **[docs/whitepaper.md](whitepaper.md)** - Theoretical foundation
2. **[tests/whitepaper-verification.js](../tests/whitepaper-verification.js)** - Test suite
3. **[docs/standards/](standards/)** - All architecture standards

---

## 🔗 External Resources

- **GitHub Repository:** https://github.com/RSBalchII/anchor-engine-node
- **License:** AGPL-3.0
- **NPM Packages:** @rbalchii/* (native modules)

---

## 📞 Support & Contribution

### Getting Help
- Check **[README.md](../README.md)** for common issues
- Review **[docs/ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** for system understanding
- Read **[CHANGELOG.md](../CHANGELOG.md)** for recent fixes

### Contributing
1. Read **[docs/whitepaper.md](whitepaper.md)** for theoretical foundation
2. Review **[docs/standards/](standards/)** for architecture guidelines
3. Run **[tests/whitepaper-verification.js](../tests/whitepaper-verification.js)** before submitting

---

**Last Updated:** February 22, 2026  
**Version:** 4.1.2  
**Status:** ✅ Production Ready (95% whitepaper compliance)
