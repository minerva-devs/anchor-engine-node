# JOSS Submission Guide for STAR

**Target:** Journal of Open Source Software (JOSS)  
**Paper:** `paper.md`  
**Bibliography:** `paper.bib`  
**Estimated Review Time:** 2-4 weeks  
**Cost:** FREE

---

## Pre-Submission Checklist

### Repository Requirements

- [ ] **Open source license** (OSI-approved) ✅ AGPL-3.0
- [ ] **README with installation instructions** ✅ Present
- [ ] **Documentation** ✅ Comprehensive docs/
- [ ] **Tests** ✅ tests/ directory
- [ ] **Contributing guidelines** ✅ CONTRIBUTING.md (add if missing)
- [ ] **Code of Conduct** ✅ CODE_OF_CONDUCT.md (add if missing)

### Software Functionality

- [ ] Software compiles/runs ✅ Version 4.2.0 production
- [ ] Clear research application ✅ Personal knowledge management
- [ ] Novel scholarly contribution ✅ Graph physics + browser paradigm

### Paper Requirements

- [ ] Between 750-1750 words ✅ ~1,200 words
- [ ] Markdown format ✅ paper.md
- [ ] YAML metadata header ✅ Present
- [ ] Summary section ✅ Present
- [ ] Statement of need ✅ Present
- [ ] State of the field ✅ Present
- [ ] Software design ✅ Present
- [ ] Research impact ✅ Present
- [ ] AI disclosure ✅ Present
- [ ] References in BibLaTeX format ✅ paper.bib

---

## Submission Steps

### Step 1: Add Required Files

If missing, add these to your repo:

```bash
# Add CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# Contributing to STAR/Anchor Engine

Thank you for your interest in contributing!

## Development Setup

```bash
pnpm install
pnpm build
pnpm dev
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit PR with clear description

## Code of Conduct

Be respectful and constructive in all interactions.
EOF

# Add CODE_OF_CONDUCT.md
cat > CODE_OF_CONDUCT.md << 'EOF'
# Code of Conduct

## Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

## Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community

## Enforcement

Violations may result in temporary or permanent ban from project spaces.
EOF
```

### Step 2: Test Paper Compilation

Install the JOSS paper preview tool:

```bash
# Using Docker (recommended)
docker run --rm \
    --volume $PWD:/data \
    --user $(id -u):$(id -g) \
    --env JOURNAL=joss \
    openjournals/inara

# This creates paper.pdf in your directory
```

**Alternative:** Use the GitHub Action (add to `.github/workflows/draft-pdf.yml`):

```yaml
name: Draft PDF
on: [push]

jobs:
  paper:
    runs-on: ubuntu-latest
    name: Paper Draft
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build draft PDF
        uses: openjournals/openjournals-draft-action@master
        with:
          journal: joss
          paper-path: paper.md
      - name: Upload
        uses: actions/upload-artifact@v4
        with:
          name: paper
          path: paper.pdf
```

### Step 3: Submit to JOSS

1. Go to: https://joss.theoj.org/
2. Click "Submit Paper"
3. Fill out form:
   - **Repository URL:** https://github.com/RSBalchII/anchor-engine-node
   - **Software Version:** 4.2.0
   - **Title:** STAR: Semantic Temporal Associative Retrieval - A Local-First Graph-Based Context Engine
   - **Description:** A local-first graph-based information retrieval system enabling resource-constrained devices to navigate large-scale personal knowledge corpora using sparse bipartite graphs with physics-inspired scoring.

4. Upload:
   - `paper.md`
   - `paper.bib`

5. Submit!

---

## What Happens Next

### Week 1: Pre-Review
- JOSS editors check submission completeness
- If accepted for review, they assign handling editor

### Week 2-4: Review
- Two reviewers assigned
- Review happens in **public GitHub issue** on your repo
- Reviews focus on:
  - Software functionality (does it work?)
  - Research contribution (is it novel?)
  - Documentation (can others use it?)
  - Code quality (is it maintainable?)

### Review Criteria
JOSS reviewers check:
- [ ] Software has obvious research application
- [ ] Author is clearly identified
- [ ] README includes installation instructions
- [ ] Software license is OSI-approved
- [ ] Paper includes all required sections
- [ ] References are complete

### Possible Outcomes
1. **Accept** (rare on first round)
2. **Minor revisions** (typical)
3. **Major revisions** (if significant issues)
4. **Reject** (if not research software or already published)

---

## Anticipated Reviewer Questions

### Q: "How is this different from existing graph databases?"
**A:** STAR is not a general-purpose graph database. It's a specialized retrieval system with:
- Temporal decay built into scoring (not an afterthought)
- Multiplicative physics model (not additive filtering)
- Byte-offset lazy loading (not in-memory storage)
- Explainable tag paths (not opaque traversals)

### Q: "Where are the tests?"
**A:** Point to `tests/` directory. If tests are sparse, add a few unit tests before submission.

### Q: "Is this just a personal project?"
**A:** Production v4.2.0, real-world deployment on 28M tokens, designed for general use via API.

### Q: "Why AGPL and not MIT/Apache?"
**A:** AGPL ensures derivatives remain open source, critical for sovereign AI memory systems.

---

## Advantages of JOSS for Your Situation

✅ **No endorsement needed** (unlike arXiv)
✅ **No institutional affiliation required**
✅ **Free** (unlike IEEE Access ~$1,800)
✅ **Fast** (2-4 weeks vs 3-6 months for journals)
✅ **Respected** (indexed in Google Scholar, DOI assigned)
✅ **Software-focused** (perfect for your implementation)
✅ **Open review** (transparent, constructive feedback)

---

## After Acceptance

1. **Get DOI** (immediately citable)
2. **Update GitHub README** with JOSS badge
3. **Tweet announcement** with DOI link
4. **Use for arXiv endorsement** (now you have a paper!)
5. **Add to CV/website** as peer-reviewed publication

---

## Emergency Contacts

**JOSS Editorial Team:**
- Website: https://joss.theoj.org/
- Issues: https://github.com/openjournals/joss/issues
- Twitter: @JOSS_TheOJ

**If submission rejected:**
- Address reviewer concerns
- Resubmit (JOSS allows resubmission)
- Or: Submit to Zenodo for immediate DOI while fixing issues

---

## Timeline

| Day | Action |
|-----|--------|
| 0 | Add CONTRIBUTING.md, CODE_OF_CONDUCT.md if missing |
| 0 | Test paper compilation with Docker |
| 1 | Submit to JOSS |
| 1-7 | Pre-review (editor check) |
| 7-28 | Review (2 reviewers) |
| 28-35 | Revisions (if needed) |
| 35 | Acceptance + DOI assigned |

**Total time: 5-8 weeks to DOI**

---

## Bottom Line

JOSS is **perfect** for STAR because:
1. It's designed for research software (your implementation matters)
2. No gatekeeping (independent researchers welcome)
3. Fast (weeks not months)
4. Free (no APC)
5. Gets you a DOI (citable, legitimate)
6. Can use for arXiv endorsement later

**Submit this week.** You've done the hard work (software, benchmarks, paper). This is the easy part.

---

**Ready?** Run the Docker compile test, then submit at https://joss.theoj.org/

Good luck! 🚀
