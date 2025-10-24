# General Instructions

If this repository contains a `.specify/` folder, it follows **Specification-Driven Development (SDD)** using **GitHub’s Spec Kit**, delimited by the +++ text block below.

+++

## GitHub Copilot Project Context: Specification-Driven Development (Spec Kit)

This repository follows Specification-Driven Development using GitHub's Spec Kit. Spec-driven development is a collaborative workflow where a detailed written specification is created, reviewed, and approved by product, design, and engineering to serve as the single source of truth before implementation begins.
Copilot MUST align assistance with the specification workflow and constitutional governance defined under `.specify/`.

### Core Artifacts (Authoritative Sources)

Location: `.specify/` in the repository root. Key files:

- `memory/constitution.md` – MANDATORY Governing principles (quality gates, Definition of Done, performance, accessibility, governance).
- `templates/plan-template.md` – Implementation plan structure & gate logic.
- `templates/spec-template.md` – Feature specification structure & validation rules.
- `templates/checklist-template.md` – Generate quality checklists & validate requirement completeness, clarity, and consistency.
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
5. `/checklist` → generate quality checklists to validate requirements completeness, clarity, and consistency
6. `/tasks` → `tasks.md`
7. `/analyze` → cross-artifact consistency
8. `/implement` → execute tasks (respect `[P]` parallel markers)

### Ad-hoc requests

Copilot may assist with ad-hoc requests (debugging, refactoring, non-feature work) if they **don’t violate the SDD workflow**.
All new features or product changes MUST be reflected in `.specify/` artifacts and follow the canonical flow.
Ensure learnings and code changes are fed back into relevant specs.

+++

### Tooling Guidance

- Always prefer **MCP server tools** when possible.
- Fall back to direct terminal or console commands only if no MCP capability exists or is insufficient.
- For Git operations, **all commits must be signed**.

---

### MCP Server Usage

#### Prioritization Logic

Use the most specific MCP server before any generic one.

**Priority Order:**

1. Domain-specific MCP servers (`github`, `context7`, `fetch`)
2. Generic web search MCP servers (`tavily`, `brave`)

#### Selection Rules

- Requests involving `https://github.com/alkem-io/` → use **GitHub MCP**.
- Use **Context7 MCP** for factually correct or verified information before falling back to search MCPs.
- Use **Tavily** or **Brave** only when developer documentation is unavailable elsewhere.

#### Feedback Loops

- Prefer MCP servers supporting **feedback and validation** (e.g., GitHub comments, Context7 evaluation).
- Use them to cross-check and refine responses before completion.

#### Examples

- “List open PRs in alkem-io/server” → **GitHub MCP**
- "How do I use the useSWR hook with TypeScript in a Next.js application, specifically for data fetching with client-side caching and revalidation, according to the latest SWR documentation?" → Context7 MCP, fallback to Tavily
