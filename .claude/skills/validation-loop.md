# Validation Loop with Overmind

When implementing changes that require continuous feedback (type checking, tests, server restarts), use the Overmind-based validation loop for rapid iteration.

## Overview

Overmind runs three parallel processes:
- **ts**: TypeScript type checking in watch mode
- **test**: Jest in watch mode (affected tests)
- **app**: NestJS development server with hot reload

All output is aggregated to a log file that can be monitored for errors.

## Log File Location

The aggregated log file is at `/tmp/overmind-log.txt`. Read this file to check for:
- TypeScript errors (TS codes like TS2322)
- Test failures (FAIL, assertion errors)
- Runtime exceptions
- Server startup issues

## Validation Loop Workflow

1. **Check current errors** before making changes:
   ```bash
   cat /tmp/overmind-log.txt | tail -50
   ```

2. **Make code changes** using Edit/Write tools

3. **Wait briefly** for watchers to detect changes (~2-3 seconds)

4. **Read the log** to verify fixes or identify new issues:
   ```bash
   cat /tmp/overmind-log.txt | tail -100
   ```

5. **Repeat** until all errors are resolved

## Quick Commands

```bash
# View recent log output
tail -50 /tmp/overmind-log.txt

# Watch log in real-time (use sparingly)
tail -f /tmp/overmind-log.txt

# Filter for errors only
grep -iE '(error|FAIL|exception|TS[0-9]+)' /tmp/overmind-log.txt | tail -20

# Check overmind status
cd .scripts/overmind && ./status.sh

# Restart a specific process
cd .scripts/overmind && overmind restart app
```

## Connecting to Individual Processes

For interactive debugging:
```bash
cd .scripts/overmind
overmind connect ts     # TypeScript watcher
overmind connect test   # Jest (interactive)
overmind connect app    # NestJS server
# Detach with Ctrl+b d
```

## Starting Overmind

If not already running:
```bash
cd .scripts/overmind
~/.local/bin/overmind start -f Procfile.dev
```

Prerequisites:
1. Docker services running: `pnpm run start:services`
2. Migrations applied: `pnpm run migration:run`

## GQL Validation Process

Overmind also runs a 4th process: **gql** — validates test-suites `.graphql` operations against `schema.graphql` every 5 minutes.

### GQL-Specific Commands

```bash
# View GQL validation log
tail -50 /tmp/overmind-gql-log.txt

# View latest validation summary
cat .claude/pipeline/results/_summary.json

# View a specific query result
cat .claude/pipeline/results/GetSpaceData.json

# List all failed queries
grep -l '"status": "error"' .claude/pipeline/results/*.json

# Connect to GQL process
cd .scripts/overmind
overmind connect gql
# Detach with Ctrl+b d

# Restart GQL validation
cd .scripts/overmind
overmind restart gql

# Run validation manually (outside overmind)
bash .scripts/gql-validate/validate-queries.sh
```

### GQL Result Format

Each validated operation produces a JSON file in `.claude/pipeline/results/`:
- `status`: "success" or "error"
- `errors[]`: validation errors with `category` (SCHEMA_MISMATCH, TYPE_ERROR, VARIABLE_ERROR, FRAGMENT_ERROR)
- `deprecations[]`: deprecated field usage warnings
- `_summary.json`: aggregate counts (total, pass, fail, deprecated)

## Best Practices

- Always check the log after edits to close the feedback loop
- Focus on TypeScript errors first (they block compilation)
- Test failures show after TS passes
- Server errors appear after successful compilation
- GQL validation errors indicate test-suites queries that need updating after schema changes
- Use `grep` to filter noise when the log is verbose
