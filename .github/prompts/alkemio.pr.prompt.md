````prompt
---
description: Compose an agents.md-compliant pull request description that enforces governance, testing, and risk reporting.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before producing the pull request description.

## Outline

1. **Establish context**
   - Run `.specify/scripts/bash/check-prerequisites.sh --json` from the repository root to obtain `FEATURE_DIR`, `SPEC_PATH`, and `PLAN_PATH`. All paths must be absolute. When arguments include single quotes, escape them using `'\''` or prefer double quotes.
   - Capture current branch name (`git rev-parse --abbrev-ref HEAD`) and latest commit hash (`git rev-parse HEAD`).
   - Read `.specify/memory/constitution.md`, `agents.md`, and `.github/copilot-instructions.md` to confirm governance requirements.

2. **Collect governing artifacts** (if they exist)
   - From `FEATURE_DIR`, read:
     - `spec.md`: capture spec ID, phase, user stories, acceptance criteria, and explicit risk notes.
     - `plan.md`: capture implementation path, classification (Agentic vs Full SDD), planned phases, and exit criteria.
     - `tasks.md` (or checklist files): derive tasks completed vs remaining.
     - `clarify/` and `checklist/` documents for unresolved decisions or debt.
   - If documents are missing, state that explicitly in the PR description and request follow-up.

3. **Inspect code changes and tests**
   - Use the GitHub MCP server to retrieve the pull request or branch diff (files changed, stats, comments). Prefer existing feature branch commits over local workspace state when both exist.
   - When no remote diff is available, fall back to local inspection (`git status --short`, `git diff --stat`) to categorize changes across `domain/`, `services/`, `schema/`, `migrations/`, `tests/`, `docs/`.
   - For schema-impacting changes, ensure `schema.graphql` and `schema-baseline.graphql` status is recorded and report any `pnpm run schema:*` commands executed.
   - Gather test evidence by parsing the latest test/lint command outputs from the terminal buffer or running targeted commands when absent.

4. **Detect and reconcile drift (governance-first)**
   - Using the artifacts from steps 1–3 and the GitHub MCP diff, identify discrepancies between:
     - Source code vs `docs/*` (Design, Developing, QA, Pagination, etc.)
     - Code/spec implementation vs `specs/<NNN-*>/(spec|plan|tasks).md`
     - Practices vs `agents.md` and `.github/copilot-instructions.md`
     - Policies vs `.specify/memory/constitution.md`
   - Classify each discrepancy:
     - Governance violation (constitution/agents misalignment)
     - Process/tooling drift (copilot-instructions vs reality)
     - Contract drift (GraphQL schema, migrations vs docs/spec)
     - Documentation drift (guides outdated vs current behavior)
   - Remediate according to agents.md conflict rule (fix the lowest incorrect layer):
     - If documentation is stale: update `docs/*` in this PR to match current behavior.
     - If spec/plan/tasks are stale for the implemented scope: update the feature artifacts under `specs/<NNN-*>` in this PR.
     - If practices contradict agents.md or copilot-instructions: update `.github/copilot-instructions.md` in this PR; if the change implies a policy shift, open a separate governance PR to amend `agents.md` (label: `governance-change`).
     - If a true principle gap exists (constitution change): open a separate governance PR to modify `.specify/memory/constitution.md` (label: `governance-change`) and reference rationale.
     - Never mask governance violations with code tweaks; prefer aligning docs/process first, then code if still required.
   - Record all edits and, when separate PRs are needed, create links/placeholders and include them in the PR description.

5. **Build governance summary**
   - Determine current phase (e.g., `/implement`, `/stabilize`, `/done`) from plan/spec markers or branch labels.
   - Record whether risks changed from the plan; capture new risks or mitigations.
   - Note outstanding tasks blocking phase exit and whether escalation to Full SDD/Agentic shift occurred.

6. **Compose pull request description**
   - Follow the structure below exactly.
   - Use tight bullet lists (per copilot instructions) and keep sections present even if marked `None`.

## Output Template

```markdown
## Summary
- Short, outcomes-focused bullets (1–3) referencing major code or contract changes.

## Governance
- Spec: <link or `None`> (include ID)
- Plan Phase: <phase> (Agentic|Full SDD)
- Branch: `<branch>` @ `<short-sha>`
- Risk Changes: <Yes|No> – brief note
- Outstanding Tasks: <None|list>

## Implementation Highlights
- Domain: <impact or `None`>
- Services/API: <impact or `None`>
- Schema & Contracts: <impact, include schema diff status, migrations>
- Tests Added/Updated: <paths or `None`>
- Docs & Ops: <updated guidance, infra, or `None`>

## Validation
- Commands: `...`
- Evidence: <pass/fail + notes; call out skipped validations>

## Drift & Alignment
- Governance: <None|violations found + actions (docs/process updates, separate governance PR refs)>
- Contracts: <None|schema/migration drift + actions>
- Specs/Plan/Tasks: <None|drift + updates made>
- Documentation: <None|files updated>

## Risks & Mitigations
- ⚠️ <risk> – mitigation/status
- ✅ <mitigated risk> – evidence

## Follow-up
- Next Steps: <None|list>
- Stakeholders: <who needs notification>

<!-- FEATURE-DIFF:BEGIN -->
Feature Diff Summary (Spec <ID>)

Base: <branch>

File Impact
Category Files Notes
domain <count> <summary>
services <count> <summary>
schema <count> <summary>
migrations <count> <summary>
tests <count> <summary>

Contract Deltas
- GraphQL: <additions/removals>
- Events: <changes>
- Migrations: <changes>

Risk & Mitigations
- ✅ <resolved>
- ⚠️ <pending>

Outcomes vs Target
- Goal: <original goal>
- Metric readiness: <met|pending>

<!-- FEATURE-DIFF:END -->
```

## Additional Rules

- Preserve the `<!-- FEATURE-DIFF:BEGIN -->` markers; fill this block only when the phase is `/done`. Otherwise leave the block with `Metrics pending.` and clearly state `Not yet at /done`.
- Every section must be present. Use `None` when there is nothing to report rather than omitting sections.
- Highlight schema or migration modifications explicitly to satisfy contract governance checks.
- When risks escalate, instruct reviewers on required follow-up (e.g., promote to Full SDD, request security review).
- Prefer repo-relative paths (e.g., `src/domain/...`) when referencing files.
- If automation outputs (schema diff, lints) are missing, add an action item under **Follow-up** to run them.
- Keep tone factual and concise; no marketing language.
- Use GitHub MCP data whenever remote commits exist; only rely on local workspace state when MCP context is unavailable.
 - Apply the conflict rule from `agents.md`: fix the lowest incorrect layer. Prefer updating docs/specs/process over changing core code or principles unless justified.
 - Do not modify the constitution or `agents.md` in the same PR as feature/code changes; open a separate PR with label `governance-change` and reference it under Drift & Alignment.
````
