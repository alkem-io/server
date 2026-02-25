# GQL Pipeline: Agent Teams + Hooks Implementation

A complete, copy-paste-ready setup for a continuous GraphQL testing pipeline using Claude Code's Agent Teams and Hooks.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     TEAM LEAD (you)                          │
│           Coordinates via shared task list                   │
│              Use delegate mode (Shift+Tab)                   │
└──────┬──────────────┬──────────────────┬─────────────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ gql-runner  │ │ gql-fixer   │ │ gql-reviewer │
│  (haiku)    │ │  (sonnet)   │ │  (opus)      │
│             │ │             │ │              │
│ Discovers & │ │ Diagnoses & │ │ Reviews &    │
│ runs all    │ │ fixes GQL   │ │ merges PRs   │
│ GQL queries │ │ errors,     │ │ or rejects   │
│             │ │ opens PRs   │ │ with feedback│
└──────┬──────┘ └──────┬──────┘ └──────┬───────┘
       │              │                │
       └──────────────┴────────────────┘
                      │
              Shared task list
           + direct SendMessage
           + file-based pipeline/
```

**Communication flows:**
- Task dependencies enforce ordering (runner → fixer → reviewer)
- `SendMessage` for real-time teammate-to-teammate updates
- `.claude/pipeline/` dirs for structured data exchange
- Hooks provide deterministic quality gates on top

---

## Step 1: Enable Agent Teams

### `.claude/settings.local.json`

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "tmux",
  "permissions": {
    "allow": [
      "Bash(gh pr:*)",
      "Bash(git:*)",
      "Bash(tsc:*)",
      "Bash(npx:*)",
      "Bash(curl:*)",
      "Bash(jq:*)",
      "Bash(find:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)",
      "Bash(touch:*)",
      "Bash(wc:*)",
      "Bash(grep:*)",
      "Read",
      "Glob",
      "Grep",
      "Write",
      "Edit"
    ],
    "deny": [
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/on-task-completed.sh"
          }
        ]
      }
    ],
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/on-teammate-idle.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "A GQL pipeline agent is trying to stop. Context: $ARGUMENTS\n\nCheck the pipeline state:\n1. Are there unprocessed error results in .claude/pipeline/results/ ?\n2. Are there unfixed errors (PRs not yet created)?\n3. Are there unreviewed PRs?\n\nIf there is still pending work relevant to THIS agent's role, respond {\"decision\": \"block\", \"reason\": \"There are N pending items. Continue processing.\"}.\nIf the agent has completed all available work, respond {\"decision\": \"approve\", \"reason\": \"All work processed.\"}.",
            "timeout": 15
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/on-stop.sh"
          }
        ]
      }
    ]
  }
}
```

> **Note on permissions**: Without explicit allow rules, teammates stall on
> permission prompts with nobody to approve them. The allow list above covers
> the tools the pipeline needs. Adjust to match your project.

---

## Step 2: Pipeline Directory Structure

### `.claude/hooks/setup-pipeline.sh`

Run this once to initialize the pipeline directories:

```bash
#!/bin/bash
set -euo pipefail

PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

mkdir -p "$PIPELINE_DIR/results"
mkdir -p "$PIPELINE_DIR/fixes"
mkdir -p "$PIPELINE_DIR/reviews"
mkdir -p "$PIPELINE_DIR/signals"

# Initialize tracking files
touch "$PIPELINE_DIR/results/.last-cycle"
touch "$PIPELINE_DIR/fixes/.processed"
touch "$PIPELINE_DIR/reviews/.processed"

echo "Pipeline directories initialized at $PIPELINE_DIR"
```

You can wire this to SessionStart so it runs automatically:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/setup-pipeline.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Step 3: Hook Scripts

### `.claude/hooks/on-task-completed.sh`

This is the **primary quality gate**. When a teammate calls `TaskUpdate` to mark
a task complete, this hook fires. Exit code 2 rejects the completion and sends
the stderr message back to the agent as feedback.

```bash
#!/bin/bash
set -uo pipefail

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // "unknown"')
TASK_ID=$(echo "$INPUT" | jq -r '.task_id // "unknown"')
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')
PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

# ─── RUNNER completed ────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "runner"; then

  # Check that at least one result was written this cycle
  RESULT_COUNT=$(find "$PIPELINE_DIR/results" -name "*.json" \
    -newer "$PIPELINE_DIR/results/.last-cycle" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RESULT_COUNT" -eq 0 ]; then
    echo "No query results were produced this cycle. Execute queries before completing." >&2
    exit 2
  fi

  # Count errors for downstream awareness
  ERROR_COUNT=$(find "$PIPELINE_DIR/results" -name "*.json" \
    -newer "$PIPELINE_DIR/results/.last-cycle" \
    -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | wc -l | tr -d ' ')

  # Mark cycle boundary
  touch "$PIPELINE_DIR/results/.last-cycle"

  echo "Runner cycle complete: $RESULT_COUNT results, $ERROR_COUNT errors." >&2
  exit 0

fi

# ─── FIXER completed ─────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "fixer"; then

  # Check that any error results have corresponding fix records
  UNFIXED=$(comm -23 \
    <(find "$PIPELINE_DIR/results" -name "*.json" \
        -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNFIXED" -gt 0 ]; then
    # Check retry count — allow completion after 2 failed attempts per query
    RETRIES=$(find "$PIPELINE_DIR/fixes" -name "*-retry-*" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RETRIES" -lt "$((UNFIXED * 2))" ]; then
      echo "$UNFIXED errors still unfixed (retries: $RETRIES). Continue fixing or document why they can't be fixed." >&2
      exit 2
    fi
  fi

  # Verify latest PR actually exists on GitHub
  LATEST_FIX=$(ls -t "$PIPELINE_DIR/fixes"/*.json 2>/dev/null | head -1)
  if [ -n "$LATEST_FIX" ]; then
    PR_URL=$(jq -r '.pr_url // empty' "$LATEST_FIX")
    if [ -n "$PR_URL" ]; then
      PR_STATE=$(gh pr view "$PR_URL" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")
      if [ "$PR_STATE" = "UNKNOWN" ]; then
        echo "Could not verify PR $PR_URL exists. Retry creating it." >&2
        exit 2
      fi
    fi
  fi

  exit 0

fi

# ─── REVIEWER completed ──────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "reviewer"; then

  # Check for unreviewed fixes
  UNREVIEWED=$(comm -23 \
    <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "$UNREVIEWED PRs still need review. Continue reviewing." >&2
    exit 2
  fi

  exit 0

fi

# ─── Unknown teammate — allow ────────────────────────────────
exit 0
```

### `.claude/hooks/on-teammate-idle.sh`

Fires when a teammate finishes its turn and goes idle. Exit code 2 sends
feedback and keeps the teammate working. Exit code 0 allows idle.

```bash
#!/bin/bash
set -uo pipefail

INPUT=$(cat)
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')
PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

# ─── RUNNER idle ──────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "runner"; then

  # Cooldown: avoid spinning. Require 3 min between cycles.
  LAST_RUN=$(stat -c %Y "$PIPELINE_DIR/results/.last-cycle" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_RUN))

  if [ "$ELAPSED" -lt 180 ]; then
    REMAINING=$((180 - ELAPSED))
    # Allow idle — it's just cooling down
    exit 0
  fi

  # If cooldown passed, there's work to do
  echo "Cooldown complete. Start a new query cycle." >&2
  exit 2

fi

# ─── FIXER idle ───────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "fixer"; then

  UNFIXED=$(comm -23 \
    <(find "$PIPELINE_DIR/results" -name "*.json" \
        -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNFIXED" -gt 0 ]; then
    echo "$UNFIXED errors need fixing. Check .claude/pipeline/results/ for error files." >&2
    exit 2
  fi

  # Nothing to fix
  exit 0

fi

# ─── REVIEWER idle ────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "reviewer"; then

  UNREVIEWED=$(comm -23 \
    <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "$UNREVIEWED PRs pending review. Check .claude/pipeline/fixes/ for PR summaries." >&2
    exit 2
  fi

  exit 0

fi

exit 0
```

### `.claude/hooks/on-stop.sh`

Prevents the entire session from stopping while the pipeline has work in flight:

```bash
#!/bin/bash
set -uo pipefail

PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

ERRORS=$(find "$PIPELINE_DIR/results" -name "*.json" \
  -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | wc -l | tr -d ' ')

UNFIXED=$(comm -23 \
  <(find "$PIPELINE_DIR/results" -name "*.json" \
      -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
  <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
  | wc -l | tr -d ' ')

UNREVIEWED=$(comm -23 \
  <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | sort -u) \
  <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
  | wc -l | tr -d ' ')

if [ "$UNFIXED" -gt 0 ] || [ "$UNREVIEWED" -gt 0 ]; then
  echo "Pipeline still active: $ERRORS total errors, $UNFIXED unfixed, $UNREVIEWED unreviewed PRs." >&2
  echo "Wait for all teammates to complete or manually stop with Ctrl+C." >&2
  exit 2
fi

exit 0
```

Make all hooks executable:

```bash
chmod +x .claude/hooks/*.sh
```

---

## Step 4: Skill (Shared Pipeline Knowledge)

### `.claude/skills/gql-pipeline/SKILL.md`

```yaml
---
name: gql-pipeline
description: "Shared context for the GQL testing pipeline: directory structure, conventions, error taxonomy, and API config"
---

## Pipeline Directories

All pipeline state lives under `.claude/pipeline/`:

| Directory   | Purpose                              | Written by  | Read by         |
|-------------|--------------------------------------|-------------|-----------------|
| `results/`  | Query execution results (JSON)       | runner      | fixer           |
| `fixes/`    | Fix summaries with PR URLs (JSON)    | fixer       | reviewer        |
| `reviews/`  | Review decisions (JSON)              | reviewer    | fixer (rejects) |
| `signals/`  | Inter-agent trigger files            | hooks       | all             |

Each directory has a `.processed` file listing already-handled items (one per line).

## Result File Schema

```json
{
  "query_name": "GetUserProfile",
  "query_file": "src/graphql/queries/user.graphql",
  "variables": { "userId": "test-user-1" },
  "status": "error" | "success",
  "response_status": 200,
  "response_body": { ... },
  "errors": [
    {
      "message": "Cannot query field 'legacyId' on type 'User'",
      "category": "SCHEMA_MISMATCH"
    }
  ],
  "timestamp": "2026-02-19T10:30:00Z"
}
```

## Fix Summary Schema

```json
{
  "query_name": "GetUserProfile",
  "error_category": "SCHEMA_MISMATCH",
  "branch": "fix/gql-GetUserProfile",
  "pr_url": "https://github.com/org/repo/pull/123",
  "files_changed": ["src/graphql/queries/user.graphql"],
  "description": "Removed deprecated legacyId field, replaced with id",
  "timestamp": "2026-02-19T10:35:00Z"
}
```

## Review Record Schema

```json
{
  "pr_url": "https://github.com/org/repo/pull/123",
  "decision": "merged" | "changes_requested",
  "reason": "Type-checks pass, only GQL files changed, fix is minimal",
  "tsc_result": "pass",
  "lint_result": "pass",
  "feedback": null | "Fix is too broad — touches unrelated components",
  "timestamp": "2026-02-19T10:40:00Z"
}
```

## Error Categories

| Category          | Meaning                                     | Fix approach                        |
|-------------------|---------------------------------------------|-------------------------------------|
| SCHEMA_MISMATCH   | Field in query doesn't exist in schema      | Remove or rename field              |
| TYPE_ERROR        | Field type differs from expected            | Update type annotation or transform |
| DEPRECATED        | Query uses deprecated field                 | Replace with successor field        |
| AUTH_ERROR        | Permission or scope issue                   | Update operation scope / skip       |
| VARIABLE_ERROR    | Missing or wrong variable types             | Fix variable definitions            |
| NETWORK_ERROR     | API unreachable                             | Retry / skip (not a code issue)     |

## Branch Conventions

- **Runner**: works on current branch (read-only, no commits)
- **Fixer**: creates branches `fix/gql-{QueryName}` from `develop`
- **Reviewer**: merges to `develop` via squash merge

## API Configuration

- Read the dev API endpoint from `.env` as `GRAPHQL_NON_INTERACTIVE_ENDPOINT`
- Auth token from `.env` as `GQL_AUTH_TOKEN`
- If neither exists, check `src/config/` for the configured endpoint

## Query Discovery

Look in these locations:
1. `src/**/*.graphql` — standalone query files
2. `src/**/*.ts` and `src/**/*.tsx` — files containing `` gql` `` template tags
3. `src/**/queries.ts`, `src/**/mutations.ts` — barrel files
4. `codegen.yml` or `codegen.ts` — GraphQL codegen config pointing to schema
```

---

## Step 5: Subagent Definitions (Optional Enhancement)

If you want the teammates to have persistent agent definitions (for memory
across sessions and for use outside of teams), define them as subagents too.
Agent Teams will use these when the teammate name matches.

### `.claude/agents/gql-runner.md`

```yaml
---
name: gql-runner
description: "GQL query runner. Discovers and executes all GraphQL queries from the web client against the dev API. Use PROACTIVELY for GQL testing."
tools: Read, Glob, Grep, Bash
model: haiku
memory: project
skills: gql-pipeline
---

You are a GraphQL test runner for the web client.

## Your workflow

1. **Discover** all GQL queries and mutations:
   - Scan `src/**/*.graphql` for standalone query files
   - Scan `src/**/*.ts` and `src/**/*.tsx` for `gql` template literal tags
   - Parse query names and variables from each file

2. **Execute** each query against the dev API:
   - Read `GRAPHQL_NON_INTERACTIVE_ENDPOINT` and `GQL_AUTH_TOKEN` from `.env`
   - Use `curl` to POST each query with appropriate variables
   - For queries requiring variables, construct reasonable test values
   - For mutations, use dry-run/test variables that won't modify production data

3. **Log results** to `.claude/pipeline/results/{QueryName}-{timestamp}.json`:
   - Include query name, source file, variables used, full response
   - Set `"status": "error"` for any query that returns errors or non-200
   - Categorize errors: SCHEMA_MISMATCH, TYPE_ERROR, DEPRECATED, AUTH_ERROR, VARIABLE_ERROR, NETWORK_ERROR

4. **Track progress**: Skip queries already tested this cycle (check timestamps against `.last-cycle`)

## Important rules

- NEVER modify source code. You are read-only.
- NEVER execute mutations that could alter real data. Use test/mock variables.
- If you can't determine appropriate test variables, log the query as status "skipped" with a reason.
- Write one JSON file per query, not one big file.
```

### `.claude/agents/gql-fixer.md`

```yaml
---
name: gql-fixer
description: "GQL error fixer. Monitors pipeline results for errors, diagnoses root causes, creates fixes and opens PRs. Use PROACTIVELY when GQL errors are detected."
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
memory: project
skills: gql-pipeline
---

You are a GraphQL error diagnostician and fixer.

## Your workflow

1. **Scan** `.claude/pipeline/results/` for files with `"status": "error"`
2. **Skip** already-processed errors (listed in `.claude/pipeline/fixes/.processed`)
3. For each error:

   a. **Diagnose** the root cause:
      - Read the error message and category
      - Compare the query against the current GraphQL schema
      - Check if the schema recently changed (git log on schema files)

   b. **Fix** the source code:
      - Create a branch: `git checkout -b fix/gql-{QueryName} develop`
      - Edit the query file to match the current schema
      - If using codegen, also update generated types
      - Run `tsc --noEmit` on affected files to verify types

   c. **Open a PR**:
      - `git add` changed files, `git commit -m "fix(gql): update {QueryName} to match current schema"`
      - `gh pr create --base develop --title "fix(gql): {QueryName}" --body "..."`
      - Include the original error, what changed, and what was fixed in the PR body

   d. **Record** the fix in `.claude/pipeline/fixes/{QueryName}.json`
   e. **Append** the query name to `.claude/pipeline/fixes/.processed`

4. **Message** the gql-reviewer teammate when PRs are ready: "N new PRs ready for review"

## Important rules

- Max 2 fix attempts per query. After 2 rejections, write a `-retry-exhausted` file and move on.
- Keep fixes minimal — only change what's needed for the specific error.
- Never touch files unrelated to the broken query.
- Always verify with `tsc --noEmit` before committing.
- If a fix requires changes beyond GQL queries (e.g., component logic), document it in the PR description and mark as "needs-human-review".
```

### `.claude/agents/gql-reviewer.md`

```yaml
---
name: gql-reviewer
description: "GQL PR reviewer. Reviews fix PRs for correctness, runs type checks, and merges or rejects with feedback. Use PROACTIVELY when GQL fix PRs are pending."
tools: Read, Glob, Grep, Bash
model: opus
memory: project
skills: gql-pipeline
---

You are a strict code reviewer for GraphQL fix PRs.

## Your workflow

1. **Scan** `.claude/pipeline/fixes/` for PR summaries not yet in `.claude/pipeline/reviews/.processed`
2. For each PR:

   a. **Fetch the diff**: `gh pr diff {PR_URL}`

   b. **Validate** the fix:
      - Only GQL-related files changed? (queries, generated types, codegen config)
      - Fix addresses the specific error from the result file?
      - No unrelated modifications?
      - No removed test coverage?

   c. **Run checks**:
      - Checkout the branch: `git checkout {branch}`
      - `tsc --noEmit` — must pass
      - `npx eslint --no-error-on-unmatched-pattern {changed_files}` — must pass
      - Check no other queries broke: quick grep for the changed field names

   d. **Decision**:
      - **MERGE**: `gh pr merge {PR_URL} --squash --delete-branch`
      - **REJECT**: `gh pr review {PR_URL} --request-changes --body "{feedback}"`

   e. **Record** the review in `.claude/pipeline/reviews/{QueryName}.json`
   f. **Append** the PR URL to `.claude/pipeline/reviews/.processed`
   g. If rejected, **message** gql-fixer: "PR {URL} rejected: {reason}. See .claude/pipeline/reviews/{file} for details."

3. Return to `develop` branch when done: `git checkout develop`

## Merge criteria (ALL must pass)

- [ ] Only GQL query files and generated types changed
- [ ] `tsc --noEmit` passes
- [ ] Lint passes
- [ ] Fix is minimal and targeted
- [ ] PR description explains what and why

## Auto-reject triggers

- Changes to non-GQL files (components, hooks, utils)
- Removal of fields without replacement
- TypeScript errors after the fix
- More than 5 files changed (likely too broad)
```

---

## Step 6: Launch the Pipeline

### The prompt

Open Claude Code in your project directory with tmux available, then:

```
Create an agent team for continuous GQL compatibility testing.

Team name: gql-pipeline

Create these tasks with dependencies:
1. "Run full GQL query cycle" — discover and execute all GraphQL queries against the dev API, log results to .claude/pipeline/results/
2. "Fix detected GQL errors" — blocked by task 1. Process error results, create fix branches and PRs
3. "Review and merge GQL fixes" — blocked by task 2. Review PRs, run type checks, merge or reject

Spawn 3 teammates:
- "gql-runner" (use haiku model): Handles task 1. Read-only, never modifies source.
- "gql-fixer" (use sonnet model): Handles task 2. Creates branches and PRs.
- "gql-reviewer" (use opus model): Handles task 3. Reviews and merges/rejects.

After reviewer completes all reviews, create a new "Run full GQL query cycle" task to restart the loop.

I will use delegate mode. Do not implement anything yourself — only coordinate.

Read .claude/skills/gql-pipeline/SKILL.md for pipeline conventions before starting.
```

### What you'll see

With `teammateMode: "tmux"`, each teammate gets its own tmux pane:

```
┌─────────────────────┬─────────────────────┬──────────────────────┐
│  gql-runner         │  gql-fixer          │  gql-reviewer        │
│                     │                     │                      │
│  Discovering        │  (waiting — task    │  (waiting — task     │
│  queries in         │   blocked by        │   blocked by         │
│  src/**/*.graphql   │   runner)           │   fixer)             │
│  ...                │                     │                      │
│  Found 47 queries   │                     │                      │
│  Executing...       │                     │                      │
│  ✓ GetUser (200)    │                     │                      │
│  ✗ GetProfile (err) │                     │                      │
│  ...                │  Processing errors  │                      │
│                     │  fix/gql-GetProfile │                      │
│                     │  gh pr create...    │  Reviewing PR #123   │
│                     │                     │  tsc --noEmit ✓      │
│                     │                     │  gh pr merge ✓       │
└─────────────────────┴─────────────────────┴──────────────────────┘
```

### Interacting during the run

- **Shift+Tab**: Toggle delegate mode (lead coordinates only vs. can implement)
- **Shift+Up/Down**: Cycle between teammates to see their output
- **Type a message**: Goes to the currently selected teammate
- **Talk to lead**: Give instructions like "pause the runner" or "reviewer, be more strict"

---

## How the Hooks Interact with Agent Teams

```
                    Agent Teams (soft)              Hooks (hard)
                    ─────────────────              ─────────────

TASK ORDERING       TaskCreate with                 —
                    blockedBy dependencies

WORK ASSIGNMENT     Teammates auto-claim            TeammateIdle exit 2
                    unblocked tasks                 → keeps teammate working
                                                    if pending items exist

COMPLETION GATES    TaskUpdate marks                TaskCompleted exit 2
                    task complete                   → BLOCKS completion,
                                                    feeds stderr to agent
                                                    (e.g. "PR not verified")

INTER-AGENT COMMS   SendMessage between             —
                    teammates directly

PREVENTING EARLY    —                               SubagentStop prompt hook
STOP                                                → LLM evaluates if work
                                                    remains, blocks if yes

SESSION STOP        —                               Stop exit 2
                                                    → blocks entire session
                                                    from ending while active

COOLDOWNS           —                               TeammateIdle checks
                                                    .last-cycle timestamp

RETRY LIMITS        Fixer tracks retries            TaskCompleted allows
                    in filenames                    completion after N retries
```

**Key insight**: Agent Teams handle the *coordination* (who does what, in what order,
communicating results). Hooks handle the *guarantees* (did they actually do it right,
should they really stop, is the PR real). The combination is more robust than either alone.

---

## Debugging & Monitoring

### Watch pipeline state in real-time

```bash
# In a separate terminal
watch -n5 'echo "=== Results ===" && \
  find .claude/pipeline/results -name "*.json" -exec jq -c "{q:.query_name,s:.status}" {} + 2>/dev/null && \
  echo "=== Fixes ===" && \
  find .claude/pipeline/fixes -name "*.json" -exec jq -c "{q:.query_name,pr:.pr_url}" {} + 2>/dev/null && \
  echo "=== Reviews ===" && \
  find .claude/pipeline/reviews -name "*.json" -exec jq -c "{pr:.pr_url,d:.decision}" {} + 2>/dev/null'
```

### Check team state

```bash
# List active team members
cat ~/.claude/teams/gql-pipeline/config.json | jq '.members[] | {name, backendType}'

# Check task states
cat ~/.claude/tasks/gql-pipeline/*.json | jq '{id, subject, status, owner, blockedBy}'

# Read teammate inboxes (messages)
cat ~/.claude/teams/gql-pipeline/inboxes/team-lead.json | jq '.'
cat ~/.claude/teams/gql-pipeline/inboxes/gql-fixer.json | jq '.'
```

### Check hook logs

```bash
# Run Claude Code with debug logging
claude --debug 2>debug.log

# Filter for hook events
grep -i "hook" debug.log
```

---

## Tuning Tips

1. **Start with one cycle manually**: Run the prompt without the "restart loop" instruction first. Watch one full cycle (runner → fixer → reviewer) to verify the pipeline works.

2. **Adjust cooldown**: The 180-second cooldown in `on-teammate-idle.sh` prevents the runner from spinning. Increase for large query sets (takes longer to fix), decrease for quick iteration.

3. **Control retry budget**: The fixer has a 2-retry cap per query. If most errors are complex, increase to 3. If most are trivial schema drifts, 1 is enough.

4. **Cost control**: Set `--max-turns` when launching to cap token spend:
   ```
   claude --max-turns 200
   ```
   With haiku (runner) + sonnet (fixer) + opus (reviewer), expect ~5-6x single-session cost. The reviewer on Opus is the biggest contributor, but its superior reasoning catches subtle issues that Sonnet might miss. A 200-turn budget prevents runaway spend.

5. **Reviewer strictness**: The reviewer agent prompt has explicit auto-reject triggers. If you find it too strict (rejecting valid fixes), relax the criteria. If too permissive, add `tsc --strict` or additional lint rules to the hook.

6. **Permissions**: If teammates keep stalling on permission prompts, check `/permissions` in the lead session and add missing patterns to the allow list.
