## GitHub Copilot Project Context: Specification-Driven Development (Spec Kit)

This repository follows Specification-Driven Development using GitHub's Spec Kit. Spec-driven development is a collaborative workflow where a detailed written specification is created, reviewed, and approved by product, design, and engineering to serve as the single source of truth before implementation begins.
Copilot MUST align assistance with the specification workflow and constitutional governance defined under `.specify/`.

### Core Artifacts (Authoritative Sources)

Location: `.specify/` in the repository root. Key files:

- `memory/constitution.md` – MANDATORY Governing principles (quality gates, Definition of Done, performance, accessibility, governance).
- `templates/plan-template.md` – Implementation plan structure & gate logic.
- `templates/spec-template.md` – Feature specification structure & validation rules.
- `templates/tasks-template.md` – Task breakdown structure & generation rules.
- `templates/agent-file-template.md` – Pattern for maintaining this agent instructions file.

Treat future `memory/*.md` additions as long-lived organizational knowledge.

### Expected Feature Documentation Layout

Features live under `specs/NNN-sample-feature/` (replace with numbered slug; create `specs/` if absent):

```
specs/NNN-sample-feature/
    spec.md
    plan.md
    research.md
    data-model.md
    quickstart.md
    contracts/
    tasks.md
```

### Canonical Workflow

1. `/constitution` (done) → `constitution.md`
2. `/specify` → `spec.md` (WHAT & WHY only)
3. `/clarify` (resolve `[NEEDS CLARIFICATION]` markers)
4. `/plan` → `plan.md` + Phase 0/1 docs (except `tasks.md`)
5. `/tasks` → `tasks.md`
6. `/analyze` → cross-artifact consistency
7. `/implement` → execute tasks (respect `[P]` parallel markers)

### Ad-hoc requests

You can help the user with requests outside the canonical workflow, but it is ESSENTIAL that the above principles are adhered to, so any new features or changes are documented in the appropriate specification files and follow the established workflow, before changing the code. Ensure that conde chnages and learnings from the conversation on the current feature are brought back into the specs where relevant. Bug fixes, debugging, non-product related requests, etc. are acceptable, as long as they are not in conflict with the specification-driven development process.

### Tooling Guidance

- Prefer interacting with the MCP server tools whenever they can accomplish the task; fall back to direct terminal commands only when no MCP capability exists or it is insufficient for the request.

### Git

- Commits must be signed.
