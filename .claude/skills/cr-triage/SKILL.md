---
name: "cr-triage"
description: "Triage the latest CodeRabbit review on the current PR: classify every finding (inline, outside-diff, nitpick), apply accepts, push, and request the next CR review round."
argument-hint: "Optional PR number and/or the word 'autonomous' to skip the confirmation pause"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Args parsing:
- If a token matches `^\d+$` → treat as PR number.
- If a token equals `autonomous` (case-insensitive) → enable **autonomous mode** (skip the confirmation pause in step 3; the model commits to its own verdicts).
- Otherwise → interactive mode (default); auto-discover PR from current branch via `gh pr view`.

## Goal

Process the **latest** CodeRabbit (CR) review on a PR end-to-end. Cover every finding — inline comments on diff hunks, "Outside diff range" items in the review body, AND nitpicks — and respond to each one under a strict reply/commit/re-review protocol so CR runs another pass after you push.

## Hard rules (do not skip)

These are non-negotiable. If you cannot satisfy a rule, STOP and ask the user.

1. **Read the WHOLE review.** The review body contains sections that are easy to miss: "Outside diff range comments" and "Nitpick comments". Skipping these is the most common failure mode of this workflow.
2. **Never resolve threads.** Only the original commenter or the user marks threads resolved.
3. **Reply policy** (read carefully — this is the critical part):
   - **If you ACCEPT a finding and fix it in code** → DO NOT reply. CR auto-detects the fix from the diff.
   - **If you REJECT an inline finding** (your triage concludes the comment is wrong/invalid, or no code change is warranted) → reply on its thread, and the reply MUST start with `@coderabbit`.
   - **Nitpicks and outside-diff items** → NEVER reply, regardless of whether you fix them or not. Fix the ones you accept; leave the rest silently.
4. **After pushing** (whether you fixed code, replied, both, or neither) → post a top-level PR comment containing exactly `@coderabbit review` to trigger the next CR review round. CR sometimes misses re-reviewing without this nudge.

## Steps

### 1. Identify the PR and the latest CR review

```bash
# If $ARGUMENTS is empty, use the current branch's PR
gh pr view --json number,headRefName,baseRefName,url
# Latest CR review on this PR
gh api repos/{owner}/{repo}/pulls/<N>/reviews \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")] | sort_by(.submitted_at) | last'
```

Capture: review id, body, `submitted_at`.

### 2. Collect findings into three buckets

**Bucket A — Inline comments (unresolved, from the latest review):**

```bash
gh api repos/{owner}/{repo}/pulls/<N>/comments --paginate \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]")]'
```

Filter to comments whose `pull_request_review_id` matches the latest review id AND whose thread is not already resolved.

**Bucket B — "Outside diff range" items** (parsed from the review body — look for the section header literal "Outside diff range comments" or similar).

**Bucket C — Nitpicks** (parsed from the review body — section header literal "Nitpick comments").

### 3. Produce a triage table — PAUSE for confirmation (interactive mode)

Show the user a single table:

| # | Bucket | File:Line | Summary | Verdict | Reasoning |
|---|---|---|---|---|---|
| 1 | inline | foo.ts:42 | use `??` instead of `\|\|` | ACCEPT | guards against legitimate 0/false |
| 2 | inline | bar.ts:88 | rename `tmp` → `pending` | REJECT | name is local & idiomatic in this context |
| 3 | nitpick | baz.ts:10 | add JSDoc | ACCEPT | low-cost, helps readers |
| 4 | outside | — | bump dep X | REJECT | out of PR scope |

Verdicts:
- **ACCEPT** — will fix in this round.
- **REJECT** — won't fix; needs a reply ONLY if the bucket is `inline`.
- **DEFER** — track elsewhere for later; treat as REJECT for reply purposes (i.e., reply only if `inline`).

**Interactive mode (default):** STOP here. Wait for the user to confirm or revise verdicts before continuing.

**Autonomous mode (`autonomous` flag in args):** Skip the pause. Apply this verdict policy:
- ACCEPT — clearly-correct findings: typos, dead code, narrow bug fixes CR identifies precisely, mechanical refactors confined to one file, nitpicks that don't change behavior.
- REJECT — clearly-wrong findings: false positives, comments that misunderstand intent, suggestions that conflict with existing project conventions or with hard rules in `CLAUDE.md`.
- DEFER — anything ambiguous: large-scope refactors, public-API changes, anything touching authorization/security logic, anything where you would need to ask a human. Surface deferrals in the final report so the user can decide later.

Still emit the table to the transcript so the user can audit verdicts after the fact.

### 4. Apply accepts

Make the code changes for every ACCEPT. Group related changes; keep diffs minimal.

### 5. Reply to REJECTs (inline bucket ONLY)

For each REJECTED inline finding, post a reply on its thread. Reply MUST start with `@coderabbit`:

```bash
gh api repos/{owner}/{repo}/pulls/<N>/comments/<COMMENT_ID>/replies \
  -X POST -f body='@coderabbit This rename would conflict with X elsewhere; leaving as-is.'
```

**Do NOT** reply to:
- nitpicks (bucket C), regardless of verdict;
- outside-diff items (bucket B), regardless of verdict;
- inline items you ACCEPTED (CR sees the diff).

### 6. Commit + push

One commit per logical chunk, or a single commit if small. Use the project's commit conventions. Push to the PR branch.

### 7. Trigger the next CR review round

Post a top-level PR comment:

```bash
gh pr comment <N> --body "@coderabbit review"
```

REQUIRED in every case — even if you only replied without changing code, even if you only changed code without replying, even if you neither changed code nor replied (e.g., entire review triaged as REJECT-with-replies on non-inline buckets is impossible by rule 3; but a re-review nudge is still useful if the user added new commits).

### 8. Report

Concise summary to the user:
- counts per bucket (inline / outside / nitpick) and per verdict (accept / reject / defer);
- commit SHA(s) and push status;
- link to the `@coderabbit review` comment that triggers the next round.

## Failure handling

- **No CR review found** on the PR → report it; suggest the user post `@coderabbit review` to invite one; stop.
- **The latest CR review appears already-processed** (commit timestamp after its `submitted_at` AND an existing re-review request) → confirm with the user before re-processing.
- **`gh` CLI unauthenticated** → tell the user to run `gh auth login` and stop.
- **Thread already resolved** → skip it (don't reopen, don't reply).
