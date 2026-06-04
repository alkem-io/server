# Phase 0 Research — Callout Introduction Gating for Collabora Document

This document resolves the implementation unknowns identified during planning. There are no `NEEDS CLARIFICATION` items left in the spec; the questions below are codebase- and pattern-level "best fit" decisions.

---

## R1. Existing entitlement enforcement pattern

**Decision**: Use `LicenseService.isEntitlementEnabledOrFail(license, LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS)` as the primitive at each gated call site.

**Rationale**:

- This is the canonical hard-fail check already used at `role.set.resolver.mutations.ts:199` (VC invitations) and `role.set.resolver.mutations.membership.ts:266`.
- The check is synchronous, in-memory, and operates on an already-loaded `ILicense` object. It throws `LicenseEntitlementNotAvailableException` when the entitlement is absent — which matches FR-007 "entitlement absent" semantics directly.
- Following the same pattern keeps the codebase consistent (constitution principle 10: incremental hardening).

**Alternatives considered**:

- A new NestJS `Guard` or interceptor that gates by GraphQL operation name. **Rejected**: introduces a new pattern in a codebase that hand-rolls per-call-site checks; harder to test in isolation; would require parsing input args inside the guard to detect the Collabora Document type.
- A `@RequiresEntitlement(SPACE_FLAG_OFFICE_DOCUMENTS)` parameter decorator. **Rejected**: same reason; not used elsewhere in the codebase; the gate is conditional on input shape (only fires when type is Collabora Document) which decorator-style coupling does not express well.

---

## R2. Resolving the target Collaboration's License from each entry point

**Decision**: Add four narrowly-scoped helpers to `CollaborationLicenseService` (or a new `CollaborationLicenseGateService` that depends on it), each returning the relevant `ILicense` for the gate:

| Entry point | Input | Resolution path |
| --- | --- | --- |
| `createCalloutOnCalloutsSet` | `calloutsSetID` | `CalloutsSet → Collaboration.calloutsSet` (reverse lookup); load `Collaboration.license.entitlements` |
| `createContributionOnCallout` | `calloutID` | `Callout.calloutsSet.calloutsSetID → Collaboration` (same reverse lookup) |
| `moveContributionToCallout` | `targetCalloutID` | identical to `createContributionOnCallout`, **target callout's** Collaboration |
| `updateCollaborationFromSpaceTemplate` | `targetCollaborationID` | direct: load `Collaboration.license.entitlements` |

**Rationale**:

- All four entry points already load enough relations to identify the parent `CalloutsSet` or `Collaboration`. The helper consolidates the reverse lookup and ensures the license entitlements are eagerly loaded once.
- The `Collaboration.license` relation is `@OneToOne` and is `null`-able. Per FR-008 (fail closed), the helper raises `LicenseEntitlementUnevaluableException` if `license` or `license.entitlements` cannot be loaded.
- For `moveContributionToCallout` we use the **target** callout's collaboration (FR-006), not the source's. The contribution itself doesn't need to be re-resolved for licensing; only its destination matters.

**Alternatives considered**:

- Eager-load license at TypeORM entity level for `Collaboration`. **Rejected**: would impact every Collaboration query, hurting performance for the 99% of paths that don't need it. Lazy load at the gate site.
- Pass the `Collaboration` itself into resolver methods. **Rejected**: each entry point already has the parent ID; introducing a Collaboration parameter ripples to every caller and DTO.

---

## R3. Detecting "Collabora Document" in the input shape

**Decision**: Each gated mutation inspects the input DTO directly, no helper abstraction:

| Mutation | Trigger condition |
| --- | --- |
| `createCalloutOnCalloutsSet` | `calloutData.framing.type === CalloutFramingType.COLLABORA_DOCUMENT` **OR** any element of `calloutData.contributionDefaults.allowedContributionTypes` (or analogous) is `CalloutContributionType.COLLABORA_DOCUMENT` |
| `createContributionOnCallout` | `contributionData.type === CalloutContributionType.COLLABORA_DOCUMENT` |
| `moveContributionToCallout` | source `Contribution.type === CalloutContributionType.COLLABORA_DOCUMENT` (load contribution before gate) |
| `updateCollaborationFromSpaceTemplate` | template body contains at least one callout where `framing.type === COLLABORA_DOCUMENT` **or** any contribution-default-type is `COLLABORA_DOCUMENT` (pre-flight scan) |

**Rationale**:

- The trigger condition is local to each mutation's input shape. A shared helper would have to model four different DTO shapes, which adds indirection without saving lines.
- For `createCalloutOnCalloutsSet`, both framing-type and any allowed contribution types must be checked. A callout that is *Post*-framed but allows Collabora Document contributions counts as introducing Collabora capability into the Collaboration; gating on creation prevents a "shell callout that allows Collabora contributions" bypass.

**Alternatives considered**:

- Gate only on framing-type at create-callout, leave contribution-allowance to `createContribution` time. **Rejected**: it leaves the door open to creating a callout shell that advertises Collabora contributions; subsequent attempts would each need their own check. Failing early at callout creation is cleaner and aligns with FR-001's "introduces a Collabora Document" phrasing.

---

## R4. Exception design

**Decision**: Two distinct exception types raised internally; both produce the same user-facing message via the existing GraphQL error formatter:

| Exception | When raised | Log level (FR-010) | User-facing message |
| --- | --- | --- | --- |
| (none — allowed) | Entitlement is enabled; introduction proceeds | debug (decision-point per constitution principle 5) | (no error returned) |
| `LicenseEntitlementNotAvailableException` (existing) | License loaded; `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement is absent / disabled | warn | `"Office Docs is not enabled for this Collaboration."` |
| `LicenseEntitlementUnevaluableException` (NEW) | License or entitlements relation could not be loaded for the target Collaboration | error | (same message) |

The unified user-facing message is pinned (FR-007) and mapped from both exception types in the GraphQL error formatter. Both exception bodies carry `details: { collaborationId }` (FR-010 structured context, no user-identifying data).

**Rationale**:

- FR-007: external callers must see one message; internally the cause must be distinguishable. Two exception classes is the simplest expression of that.
- The new exception name follows the existing `LicenseEntitlement*Exception` family (consistency, constitution principle 7).
- Per constitution principle 5, exception messages are immutable; dynamic data lives in `details`.

**Alternatives considered**:

- Single exception with a `cause` enum field. **Rejected**: less idiomatic for the codebase; loses NestJS exception filter discrimination by class.

---

## R5. Atomic reject for template-apply (FR-005, SC-006)

**Decision**: Pre-flight scan in `TemplateApplierService.updateCollaborationFromSpaceTemplate` runs before any persistence:

1. Load target Collaboration's license (or fail-closed).
2. Iterate through the template's callouts; if `license.SPACE_FLAG_OFFICE_DOCUMENTS` is disabled, throw `LicenseEntitlementNotAvailableException` on the first encountered Collabora Document framing or contribution-allowance.
3. Only proceed to apply the template once the scan passes.

The existing `updateCollaborationFromSpaceTemplate` already runs inside a TypeORM transaction, but pre-flight is preferred over relying on transaction rollback because:
- Avoids any side effects (auth resets, event emissions) before the rejection point.
- Cleaner log/metrics: one warn entry per rejected template-apply, not N+1 entries.

**Rationale**: FR-005 mandates atomicity; the simplest atomic strategy is "check before write." This sidesteps the question of whether all downstream side effects are actually transactional.

**Alternatives considered**:

- Per-callout check during apply, with transaction rollback on first failure. **Rejected**: the spec explicitly forbids partial success even momentarily; pre-flight is more defensive.

---

## R6. Test strategy

**Decision**: Risk-based per constitution principle 6:

| Test type | Target | Cases |
| --- | --- | --- |
| Unit (`*.spec.ts`) | `LicenseEntitlementUnevaluableException` | Constructor, message immutability, details payload |
| Unit | New helper(s) on `CollaborationLicenseService` | License-found-allowed, license-found-blocked, license-missing (fail-closed), entitlements-missing (fail-closed) |
| Integration (`*.it-spec.ts`) | Each of the four gated mutations | (a) blocked when unentitled, (b) allowed when entitled, (c) move uses target only, (d) template-apply atomic reject, (e) non-Collabora callouts unaffected |
| Integration | Logging | Verify warn for absent, error for unevaluable, with `collaborationId` in structured context and no user data in message |

Skip: resolver-input-validation pass-throughs (covered by class-validator); duplicate auth-failure paths (existing infrastructure).

---

## R7. Configuration / feature flag

**Decision**: No feature flag. Gate is introduced enabled-by-default.

**Rationale**:

- The gate is a license-correctness fix, not a behavioral toggle — gating it behind a flag would weaken the license boundary it's meant to enforce.
- The `SPACE_FLAG_OFFICE_DOCUMENTS` entitlement itself is the toggle: spaces that already have it enabled in their license are unaffected; spaces that don't will see the gate fire.
- Existing entitlement gates (VC, multi-user whiteboard, multi-user memo) are not flagged either; consistency with the codebase.

**Alternatives considered**:

- A `disable.office-docs.gate` config flag. **Rejected**: opens a backdoor that cancels the feature.

---

## R8. Performance budget verification

**Decision**: SC-004 (< 5 ms p95) is satisfied trivially because:

1. The check itself is a synchronous in-memory boolean read on an already-loaded `LicenseEntitlement` array — sub-millisecond.
2. License loading at the gate site adds one `findOne` with `relations: { license: { entitlements: true } }`. Tested in existing entitlement code paths; well under 5 ms in local dev.
3. APM (Elastic) is already instrumented at the resolver level via `@InstrumentResolver`; no new instrumentation needed.

No load test is required for this feature (constitution principle 10: no speculative scale work).

---

## Summary

All implementation choices align with existing patterns in the codebase. No constitution gates need explicit justification. Phase 1 design proceeds with the helper + exception + four resolver edits described above.
