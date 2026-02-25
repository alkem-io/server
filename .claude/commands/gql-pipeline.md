---
name: gql-pipeline
description: Launch the GQL validation pipeline with Agent Teams
---

Launch the GQL validation pipeline as an Agent Team.

## Setup

First, ensure the pipeline is initialized:
```bash
bash .claude/hooks/setup-pipeline.sh
```

## Team Configuration

Create an agent team for continuous GQL compatibility testing.

Team name: gql-pipeline

Create these tasks with dependencies:
1. "Run full GQL validation cycle" — sync test-suites repo and validate all GraphQL operations against schema.graphql using AST validation. Log results to .claude/pipeline/results/
2. "Fix detected GQL errors" — blocked by task 1. Process error results from .claude/pipeline/results/, create fix branches and PRs on the appropriate repo (test-suites or server)
3. "Review and merge GQL fixes" — blocked by task 2. Review PRs, verify fixes are minimal and correct, merge or reject with feedback

Spawn 3 teammates:
- "gql-runner" (use haiku model): Handles task 1. Read-only, never modifies source. Runs `bash .scripts/gql-validate/validate-queries.sh`
- "gql-fixer" (use sonnet model): Handles task 2. Creates branches and PRs on test-suites or server repo.
- "gql-reviewer" (use opus model): Handles task 3. Reviews and merges/rejects PRs.

After reviewer completes all reviews, create a new "Run full GQL validation cycle" task to restart the loop.

Read `.claude/skills/gql-pipeline.md` for pipeline conventions before starting.

I will use delegate mode. Do not implement anything yourself — only coordinate.
