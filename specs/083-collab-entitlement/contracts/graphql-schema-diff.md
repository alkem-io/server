# Contract: GraphQL Schema Delta

**Feature**: 083-collab-entitlement

This feature produces **additive** changes to the public GraphQL schema: new enum values on `CredentialType`, `LicenseEntitlementType`, and `LicensingCredentialBasedCredentialType`.

## Expected delta in `schema.graphql`

### CredentialType

```diff
 enum CredentialType {
   SPACE_FEATURE_MEMO_MULTI_USER
+  SPACE_FEATURE_OFFICE_DOCUMENTS
   SPACE_FEATURE_SAVE_AS_TEMPLATE
 }
```

### LicenseEntitlementType

```diff
 enum LicenseEntitlementType {
   ACCOUNT_INNOVATION_HUB
   ACCOUNT_INNOVATION_PACK
   ACCOUNT_SPACE_FREE
   ACCOUNT_SPACE_PLUS
   ACCOUNT_SPACE_PREMIUM
   ACCOUNT_VIRTUAL_CONTRIBUTOR
   SPACE_FLAG_MEMO_MULTI_USER
+  SPACE_FLAG_OFFICE_DOCUMENTS
   SPACE_FLAG_SAVE_AS_TEMPLATE
   SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS
   SPACE_FLAG_WHITEBOARD_MULTI_USER
   SPACE_FREE
   SPACE_PLUS
   SPACE_PREMIUM
 }
```

The same delta appears in `schema-lite.graphql`. The `schema-baseline.graphql` file is updated by the post-merge `schema-baseline.yml` automation, not manually.

## Expected delta in `LicensingCredentialBasedCredentialType`

```diff
 enum LicensingCredentialBasedCredentialType {
   ACCOUNT_LICENSE_PLUS
   SPACE_FEATURE_MEMO_MULTI_USER
+  SPACE_FEATURE_OFFICE_DOCUMENTS
   SPACE_FEATURE_SAVE_AS_TEMPLATE
   SPACE_FEATURE_VIRTUAL_CONTRIBUTORS
   SPACE_FEATURE_WHITEBOARD_MULTI_USER
   SPACE_LICENSE_ENTERPRISE
   SPACE_LICENSE_FREE
   SPACE_LICENSE_PLUS
   SPACE_LICENSE_PREMIUM
 }
```

(Sort order reflects the canonical-sorted schema output.)

## No changes to

- Object types
- Input types
- Queries
- Mutations
- Subscriptions
- Directives
- Interfaces

## Classification

- **Breaking**: **NO**. These are additive enum values; clients using generated/exhaustive enum handling should refresh codegen or tolerate unknown enum values.
- **Deprecation required**: **NO**.
- **BREAKING-APPROVED label**: **NOT REQUIRED**.

## Commands to regenerate

```bash
pnpm run schema:print     # regenerates schema.graphql
pnpm run schema:sort      # canonical sort
pnpm run schema:diff      # diff vs tmp/prev.schema.graphql
pnpm run schema:validate  # validate
```

Review `change-report.json` for the additive change confirmation before committing the regenerated files.

## Downstream consumers

The `ecosystem-analytics/server` BFF (separate repo, per root `CLAUDE.md`) consumes this schema via `graphql-codegen`. These additive enum changes are schema-safe; the BFF will pick up the new values on its next codegen run. No coordinated release is required.
