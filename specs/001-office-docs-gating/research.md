# Research: Office Documents Feature Gating

**Feature**: `001-office-docs-gating`  
**Phase**: 0 — Research & Decision Record  
**Date**: 2026-04-21

---

## 1. Entitlement Check Mechanism: `enabled` vs `limit ≥ 1`

**Question**: The spec states the gate must be based on `SPACE_FLAG_OFFICE_DOCUMENTS.limit ≥ 1`. However, the existing space-flag entitlements all use `LicenseEntitlementDataType.FLAG` with the `enabled` boolean field. Which mechanism is correct?

**Decision**: Use the `enabled` boolean field via `LicenseService.isEntitlementEnabled()`, consistent with all other `SPACE_FLAG_*` entitlements.

**Rationale**: All existing space-flag entitlements (`SPACE_FLAG_SAVE_AS_TEMPLATE`, `SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS`, `SPACE_FLAG_WHITEBOARD_MULTI_USER`, `SPACE_FLAG_MEMO_MULTI_USER`) use `LicenseEntitlementDataType.FLAG` with `enabled: boolean`. The `isEntitlementAvailableUsingEntities` method in `LicenseEntitlementService` maps `FLAG` dataType to the `enabled` field, not `limit`. The `limit` field for `FLAG` types is always set to `0` and has no semantic meaning. The spec's "limit ≥ 1" description reflects the underlying intent (entitlement is "at least once available") but is not how the code infrastructure works for space-flag types.

**Alternatives considered**: Using `getEntitlementLimit()` and comparing `>= 1` — rejected because `FLAG` type entitlements do not use `limit` as the check signal. Using `isEntitlementAvailable()` (the async method) — rejected because it delegates to `isEntitlementAvailableUsingEntities`, which for `FLAG` types calls `enabled`, and for `LIMIT` types would require `LicenseType.ACCOUNT` which does not apply here.

**Reference**: `src/domain/common/license-entitlement/license.entitlement.service.ts` lines 151-220.

---

## 2. Entitlement Enum Value: Already Seeded vs Needs Adding

**Question**: The spec states `SPACE_FLAG_OFFICE_DOCUMENTS` was seeded by PR #5967. Is the enum value already present?

**Decision**: The `LicenseEntitlementType` enum does NOT yet contain `SPACE_FLAG_OFFICE_DOCUMENTS`. This implementation must add it.

**Rationale**: Searching `src/common/enums/license.entitlement.type.ts` confirms only these space-flag entries: `SPACE_FLAG_SAVE_AS_TEMPLATE`, `SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS`, `SPACE_FLAG_WHITEBOARD_MULTI_USER`, `SPACE_FLAG_MEMO_MULTI_USER`. PR #5967 may have added the seeding logic but the TypeScript enum value must also be added here for type safety.

**Alternatives considered**: Assuming it was already added — rejected; confirmed by grep that it is absent.

---

## 3. OfficeDocument Entity: Exists vs Needs Creating

**Question**: Does the `OfficeDocument` entity already exist in the codebase?

**Decision**: The `OfficeDocument` entity does NOT exist yet. It must be created as part of this feature.

**Rationale**: Grep for `OfficeDocument`, `officeDocument`, `office_document` across `src/**/*.ts` returns no domain entity matches. The `CalloutContribution` entity in `src/domain/collaboration/callout-contribution/callout.contribution.entity.ts` has no `officeDocument` relation. A new entity, module, service, and resolver must be created, following the Memo/Whiteboard patterns.

**Alternatives considered**: Reusing an existing entity — rejected; there is no matching entity.

---

## 4. License Traversal Path for OfficeDocument

**Question**: What traversal path should be used to reach the Collaboration license from an OfficeDocument?

**Decision**: Mirror the memo traversal exactly. OfficeDocuments only live in contributions (not in framing), so only the contribution path is needed:

```
OfficeDocument → CalloutContribution.officeDocument (ManyToOne back-ref)
→ Callout.contributions → CalloutsSet.callouts → Collaboration.calloutsSet
→ License (with entitlements)
```

**Rationale**: The spec states: "OfficeDocument → CalloutContribution → Callout → CalloutsSet → Collaboration → License". Whiteboards and memos have both a `contribution` and a `framing` path, but OfficeDocuments are contribution-only items (no framing use case). The traversal method `getCollaborationLicenseFromOfficeDocumentOrFail` should be added to `CommunityResolverService` following the exact pattern of `getCollaborationLicenseFromMemoOrFail`.

**Alternatives considered**: Making a new resolver service class — rejected; `CommunityResolverService` already centralises all such traversal methods and adding one more follows the established convention.

---

## 5. Entitlement Method: `isEntitlementEnabled` vs `isEntitlementEnabledOrFail`

**Question**: Should write-gate checks use the `isEntitlementEnabled` (returns boolean) or `isEntitlementEnabledOrFail` (throws on failure) method?

**Decision**: Use `isEntitlementEnabledOrFail` in the service method that gates writes. Expose a boolean `isEntitlementEnabled` for the `isEntitlementEnabled` resolver field.

**Rationale**: `isEntitlementEnabledOrFail` already throws `LicenseEntitlementNotAvailableException` with the correct `AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE` code. For write mutations, throwing is the correct flow. For the GraphQL resolver field, the boolean form is needed to return a value instead of throwing.

**Note**: The existing `isEntitlementEnabledOrFail` method on `LicenseService` includes the license ID in the exception message (e.g., `License: ${license?.id}`). Per coding standards, dynamic data should not be in the exception message but in the `details` property. A custom throw should be used with details or a new `isEntitlementEnabledOrFail` overload with proper details. This implementation will throw the exception with structured details rather than inline IDs.

---

## 6. Write-Gating Location: Service vs Resolver

**Question**: Should write-gate checks (create, update, delete) be enforced in the domain service or in the GraphQL resolver?

**Decision**: Enforce in the domain service (e.g., `OfficeDocumentService.create`, `OfficeDocumentService.update`, `OfficeDocumentService.delete`), before the authorization privilege check.

**Rationale**: The spec (FR-021, FR-041, FR-043) explicitly states "entitlement check MUST be performed before the authorization privilege check". The domain service is the correct location per the constitution's domain-centric design principle. Resolvers orchestrate — domain services enforce invariants. This mirrors how the spec envisions write guards and aligns with constitution Principle 1.

**Alternatives considered**: Gating in the resolver — rejected because resolvers must not embed business rules per the constitution.

---

## 7. Collaborative Editing Integration: Existing Service vs New Service

**Question**: Should `CollaborativeDocumentIntegrationService` be extended for office documents, or should a separate integration service be created?

**Decision**: Create a new `OfficeDocumentIntegrationService` following the same pattern as `CollaborativeDocumentIntegrationService`. Do not modify the existing memo service.

**Rationale**: The existing `CollaborativeDocumentIntegrationService` is tightly coupled to `MemoService` and handles memo-specific save/fetch content. Office documents have a different content model (binary files, not rich text buffers). A separate service isolates the responsibilities cleanly and avoids tangling office document logic with memo logic. The `info()` method for office documents still needs to return `{ read, update, isMultiUser, maxCollaborators }` following the same shape.

**Alternatives considered**: Reusing/extending `CollaborativeDocumentIntegrationService` — rejected; it is memo-specific for save/fetch operations. Abstracting a shared base — rejected; the spec does not require this abstraction and YAGNI applies.

---

## 8. GraphQL Field Name: `isEntitlementEnabled` vs `isLicensed`

**Question**: The spec defines the field as `isEntitlementEnabled: Boolean!`. Is this name consistent with platform conventions?

**Decision**: Use `isEntitlementEnabled: Boolean!` as specified.

**Rationale**: The spec explicitly defines this name (FR-070). Memo and Whiteboard use `isMultiUser` which is feature-specific. The `isEntitlementEnabled` name is more explicit about what it checks (the entitlement gate) rather than what it means for the feature (which is different — it gates ALL writes, not just multi-user mode). The name chosen aligns with the spec and is clear in intent.

---

## 9. MaxCollaborators Configuration

**Question**: What configuration key should control `maxCollaborators` for office document editing sessions?

**Decision**: Add `collaboration.office_documents.max_collaborators_in_room` to `alkemio.yml`, defaulting to `20`, following the memo and whiteboard pattern:

```yaml
collaboration:
  office_documents:
    max_collaborators_in_room: ${OFFICE_DOCUMENT_MAX_COLLABORATORS_IN_ROOM}:20
```

**Rationale**: Memo uses `collaboration.memo.max_collaborators_in_room: 20` and whiteboard uses `collaboration.whiteboards.max_collaborators_in_room: 20`. Consistency requires the same pattern with a separate configurable key.

---

## 10. Migration Requirement

**Question**: Is a database migration required for this feature?

**Decision**: Yes — a migration is required to create the `office_document` table and add the `officeDocumentId` FK to `callout_contribution`.

**Rationale**: The `OfficeDocument` entity does not exist. Its TypeORM entity will generate a new table. `CalloutContribution` needs a nullable OneToOne relation to `OfficeDocument`. Even though the spec says "no migration or seeding work is needed", this refers to the license entitlement seeding in PR #5967. The entity itself still needs a migration.

**Note**: The `SPACE_FLAG_OFFICE_DOCUMENTS` enum value should be propagated to existing Collaboration license seeds (in `template.content.space.service.ts`) as a `FLAG` type with `enabled: false` default — matching how all other space flags are seeded.

---

## 11. Logging: Warning Level with Structured Context

**Question**: What exactly should the warning log emit when a write is rejected?

**Decision**: Log at `warn` level with a structured message containing `collaborationId` in the structured properties, not in the message string. The message should be a static string like `Office document write rejected: entitlement not available`.

**Rationale**: FR-110 requires warning-level logging with Collaboration context. FR-081 and FR-111 require no dynamic data in the message. Per the codebase logging standards: `logger.warn({ message: '...', collaborationId }, LogContext.LICENSE)` or equivalent structured form.

---

## Summary of Key Decisions

| Decision | Chosen Approach | Key Reference |
|----------|----------------|---------------|
| Entitlement check method | `isEntitlementEnabled()` (enabled boolean, FLAG type) | `license.entitlement.service.ts` |
| Enum value | Must add `SPACE_FLAG_OFFICE_DOCUMENTS` | `license.entitlement.type.ts` |
| Entity | Create new OfficeDocument entity | Pattern from `memo.entity.ts` |
| Traversal method | Add `getCollaborationLicenseFromOfficeDocumentOrFail` | `community.resolver.service.ts` |
| Write gate location | Domain service (before auth check) | Constitution Principle 1 |
| Integration service | New `OfficeDocumentIntegrationService` | Pattern from `collaborative-document-integration.service.ts` |
| GraphQL field | `isEntitlementEnabled: Boolean!` | Spec FR-070 |
| Migration | Required (entity + FK) | New `office_document` table |
| MaxCollaborators config | New `collaboration.office_documents.max_collaborators_in_room` | alkemio.yml pattern |
| Warning log | Static message + structured collaborationId property | FR-110, FR-081 |
