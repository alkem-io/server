# PR Review Metrics Workflow

## Summary

Automated system that analyzes pull requests and recommends whether they should be reviewed by AI only or require human oversight, based on complexity and risk assessment.

**Files**:

- Workflow: `.github/workflows/review-router.yml`
- Script: `review_router.py`

---

## What It Does

### 1. Collects Metrics

- Total lines of code changed
- Number of files modified
- List of changed file paths
- Keywords from PR title

### 2. Assesses Risk

- **High-risk keywords**: security, auth, migration, architecture, deployment
- **Critical paths**: Dockerfile, workflows, authorization, migrations, schema files, core config
- **Low-risk keywords**: docs, typo, whitespace, comment, lint

### 3. Classifies Review Type

- **LLM_ONLY**: Simple, low-risk changes — suitable for AI-only review (no automatic reviewer assignment)
- **HUMAN_AUGMENTED_LLM**: Complex or risky changes → no auto-assignment

### 4. Reports & Labels

- Posts detailed metrics comment on PR
- Adds label: `review/llm-only` or `review/human-required`
- Shows only active risk flags (no false positives)

---

## Thresholds

| Metric       | Threshold |
| ------------ | --------- |
| Simple LOC   | 100 lines |
| Critical LOC | 200 lines |
| File count   | 10 files  |

---

## Triggers

Runs automatically when:

- PR opened
- PR reopened
- New commits pushed to PR

---

## LLM_ONLY Requirements (all must be true)

- LOC ≤ 100
- Files ≤ 10
- Contains low-risk keyword (docs, typo, etc.)
- No high-risk keywords
- No critical paths modified

---

## HUMAN_AUGMENTED_LLM (any condition)

- LOC > 100
- Files > 10
- High-risk keyword present
- Critical path modified

---

## Configuration

Edit `review_router.py` to customize:

```python
CONFIG = {
    "CRITICAL_LOC_THRESHOLD": 200,
    "SIMPLE_LOC_THRESHOLD": 100,
    "FILE_COUNT_THRESHOLD": 10,
    "HIGH_RISK_KEYWORDS": [...],
    "LOW_RISK_KEYWORDS": [...],
    "CRITICAL_PATHS": [...]
}
```
