# Specification Quality Checklist: MCP Server (foundation)

**Purpose**: Validate the retrospec's completeness and quality
**Created**: 2026-05-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Focused on user/operator value (agents using the platform safely)
- [x] Written for stakeholders (capability + safety framed, not code-first)
- [x] All mandatory sections completed
- [x] Implementation detail kept in plan.md / research.md / data-model.md

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Acceptance scenarios defined for every user story
- [x] Edge cases identified (concurrency, stale session, not-found, backend down)
- [x] Scope is clearly bounded (foundation vs the 101 increment vs 004 client)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] Functional requirements have acceptance criteria / scenarios
- [x] User scenarios cover the primary flows (read tools, auth, write, resources, safe-ops)
- [x] Constitution Check completed in plan.md (with honest deviations)
- [x] Decision record captured in research.md

## Retrospec accuracy caveats

- **R1 (open)**: SC-005 / FR-005 / FR-009 assert resource reads are
  permission-scoped, but the retrospec found the `resources/read` path does not
  appear to evaluate the provider's `getAuthorizationPolicy`, and providers'
  `read()` ignore the passed `ActorContext`. **The spec states the intended
  behavior; the implementation may not yet meet it for resources.** Tracked as a
  follow-up (research.md R1, tasks.md). Tool reads *do* check authorization.
- **R2/R3 (open)**: some read tools query repositories directly and
  `create_whiteboard` calls the resolver-mutations layer — structural notes, not
  correctness issues (auth still enforced).
- Verification of the foundation is largely **manual/probe-level**; automated
  coverage exists for individual tools (audit-log, community-activity,
  template-navigator specs) and, via the 101 increment, for scope + arg
  validation.

## Notes

- This is a retrospec (Status: Implemented). The unchecked items in `tasks.md`
  are intentionally-open follow-ups, not gaps in this spec.
