---
name: "cr-loop"
description: "Drive a PR to clean CodeRabbit state: wait for a CR review, feed it through cr-triage, push, re-trigger, repeat. Stops at 'Actionable comments posted: 0', a human review, PR state change, or the 10-round cap."
argument-hint: "Optional PR number and/or the word 'autonomous' (passed through to cr-triage)"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Args parsing:
- If a token matches `^\d+$` → PR number.
- If a token equals `autonomous` (case-insensitive) → run cr-triage in autonomous mode (no pause).
- Otherwise → interactive mode; auto-discover PR from current branch.

## Goal

Repeatedly: wait for the next CR review → invoke `cr-triage` (which applies accepts, pushes, and posts `@coderabbit review`) → wait for CR's next review. Exit when CR's latest review says "Actionable comments posted: 0", or on an abort condition.

## Constants

- **MAX_ROUNDS** = 10
- **POLL_INTERVAL** = 120s (stays inside the 5-minute prompt-cache window)
- **WAIT_BUDGET_PER_ROUND** = 30 minutes (max time to wait for CR to post a review after we trigger)

## Setup (first invocation only)

1. Resolve PR:
   ```bash
   gh pr view ${PR_NUMBER:-} --json number,headRefName,baseRefName,state,url,author
   ```
   Abort if state ≠ OPEN.
2. Snapshot the **starting point**:
   - `last_review_id` = id of the most recent CR review at start (or `null`)
   - `last_review_time` = its `submitted_at` (or `null`)
   - `trigger_time` = now (the moment we started this loop)
   - `round` = 0
   - `mode` = "autonomous" if args contain it, else "interactive"
3. Announce to the user one line: `cr-loop started for PR #N — mode=…, cap=10, poll=120s.`

State carries across ScheduleWakeup ticks via the conversation history; do not write state files.

## Per-iteration algorithm

Run this exactly once per wake-up.

### A. Abort checks (cheap, do first)

```bash
gh pr view <N> --json state,reviews --jq '{state, reviews}'
```

- `state ≠ OPEN` (CLOSED / MERGED) → STOP, report.
- Any review by a non-`coderabbitai[bot]` user with state `APPROVED` or `CHANGES_REQUESTED` submitted after `trigger_time` → STOP, escalate (human stepped in).
- `round ≥ MAX_ROUNDS` → STOP, report cap hit.

### B. Find a fresh CR signal (review OR completion marker)

CR signals "I finished a pass" via two surfaces — check both, take whichever is newer than `last_review_time`:

**B.1. Review with content** (typical when CR found actionable items):
```bash
if [ -n "$last_review_time" ] && [ "$last_review_time" != "null" ]; then
  gh api repos/{owner}/{repo}/pulls/<N>/reviews \
    --jq "[.[] | select(.user.login == \"coderabbitai[bot]\") | select(.body != \"\" and .body != null) | select(.submitted_at > \"$last_review_time\")] | sort_by(.submitted_at) | last"
else
  gh api repos/{owner}/{repo}/pulls/<N>/reviews \
    --jq '[.[] | select(.user.login == "coderabbitai[bot]") | select(.body != "" and .body != null)] | sort_by(.submitted_at) | last'
fi
```

(Empty-body reviews from CR are per-thread reply acknowledgments, not actual review passes — filter them out.)

**B.2. Top-level completion marker** (CR posts this when a pass concludes — and when it found 0 actionable, this is the ONLY surface that signals the pass):
```bash
gh api repos/{owner}/{repo}/issues/<N>/comments \
  --jq "[.[] | select(.user.login == \"coderabbitai[bot]\") | select(.body | contains(\"coderabbit-review-completion-marker\")) | select(.created_at > \"$last_review_time\")] | sort_by(.created_at) | last"
```

(If `last_review_time` is null/empty, drop the `> $last_review_time` clause in both queries and take the most recent unconditionally — the jq `>` comparison against the literal string `"null"` would otherwise filter out everything.)

Combine results — `latest_signal` = whichever of B.1 or B.2 has the newer timestamp.

- `latest_signal` empty AND `now - trigger_time < WAIT_BUDGET_PER_ROUND` → ScheduleWakeup(POLL_INTERVAL, reason="polling CR on PR #N round R"). DO NOT call cr-triage this tick. END.
- `latest_signal` empty AND `now - trigger_time ≥ WAIT_BUDGET_PER_ROUND` → STOP, escalate ("CR did not respond within the per-round budget").
- `latest_signal` non-empty → continue to C.

### C. Terminal check

If `latest_signal.body` contains the literal string `Actionable comments posted: 0` → STOP, success. In the report, note the nitpick count if any (the user can run `/cr-triage` manually to polish nitpicks).

Note: both surfaces from step B carry this same literal — the completion marker comment is typically `"<!-- coderabbit-review-completion-marker -->\n**Actionable comments posted: 0**"`, and a review with content starts with `**Actionable comments posted: N**` on its first line.

### D. Invoke cr-triage

- Interactive mode: invoke the `cr-triage` skill with the PR number. It will pause for the table. User confirms. cr-triage applies fixes, pushes, posts `@coderabbit review`.
- Autonomous mode: invoke `cr-triage` with both the PR number and `autonomous`. It auto-decides verdicts and runs through to push + re-trigger without pausing.

### E. Update state, re-arm

- `last_review_id` = id of the review just processed
- `last_review_time` = its `submitted_at`
- `trigger_time` = now (cr-triage just pushed `@coderabbit review`; this resets the per-round budget)
- `round` += 1
- ScheduleWakeup(POLL_INTERVAL, reason="waiting for CR review of round R push on PR #N")

## Termination report

When stopping, output one concise block to the user:

- **Stop reason**: success (0 actionable) / cap hit (10 rounds) / human review / PR state change / wait-budget exceeded
- **Rounds completed**: R
- **PR link**: …
- **Outstanding**: nitpicks remaining (count), deferrals from autonomous mode (list), human review pending action (if any)

## Failure modes

- `gh` unauthenticated → tell user, stop. Do not ScheduleWakeup.
- No PR on current branch and no PR-number arg → tell user, stop.
- `cr-triage` skill not installed in this scope → tell user, stop.
- `cr-triage` exits without pushing (e.g., user revised all verdicts to REJECT/DEFER and there's no code to commit) → still post `@coderabbit review` and continue the loop normally; this case is handled inside cr-triage's step 7.

## Interaction with cr-triage's hard rules

This loop does NOT relax any of cr-triage's hard rules. In particular:
- Threads are never resolved automatically.
- Replies still start with `@coderabbit` and only land on rejected **inline** items.
- Nitpicks and outside-diff items never get replies.
- `@coderabbit review` is posted after every push (cr-triage does this; cr-loop does not duplicate it).
