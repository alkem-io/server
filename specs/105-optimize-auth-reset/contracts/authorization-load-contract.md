# Contract: Authorization Reset Load Contract

This feature changes no GraphQL/public API surface (FR-010) — `pnpm run schema:diff` MUST stay clean. The meaningful contract here is **internal**: the rule that every `*.service.authorization.ts` involved in a space reset must obey when loading data. This contract is enforced by code review (inline comments) and the policy-equivalence regression test.

## Contract statements

**C-1 (Minimal load)**: An `applyAuthorizationPolicy` method MUST load only:
1. the entity's own `authorization` (and `parentAuthorizationPolicy` where the body reads it);
2. relations whose **content** is read while computing credential/privilege rules;
3. `id`-only projections (`select: { id: true }`, `loadEagerRelations: false`) for relations iterated solely to obtain child IDs for delegation.

It MUST NOT load any relation whose content is never read (see data-model.md drop list).

**C-2 (Rooms are policy containers)**: Room relations loaded for authorization MUST be `select: { id, authorization }` — never load messages or members.

**C-3 (Credential chains preserved)**: Loads that derive credentials (e.g. `callout … space.community.roleSet`, `parentSpace.community.roleSet`, `community.roleSet`, `account.id`, `document.createdBy`) MUST be retained — trimming them would change computed access.

**C-4 (Behaviour equivalence)**: For identical input state, the set of authorization policies produced after applying this contract MUST equal the set produced before (per-entity credential rules + privilege rules). Verified by the equivalence regression test.

**C-5 (Coverage preserved)**: Every entity type previously visited by the reset MUST still be visited and saved. `id`-only loads keep iteration intact; drops apply only to non-iterated, unread relations.

**C-6 (Observability)**: Every trimmed/minimal load MUST carry an inline comment explaining the optimization and what is intentionally not loaded (Constitution Principle 5).

**C-7 (Resilience unchanged)**: The per-entity failure-handling / `resilientCascade` behaviour MUST be unchanged (FR-009).

## Verification

| Contract | How verified |
|---|---|
| C-1, C-2, C-3, C-5, C-6 | Code review against data-model.md matrix + inline comments |
| C-4 | Policy-equivalence Vitest regression test vs captured baseline |
| C-7 | Existing resilience tests remain green; no change to cascade orchestration |
| No API change | `pnpm run schema:diff` reports no schema change |
