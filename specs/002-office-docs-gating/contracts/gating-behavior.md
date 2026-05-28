# Contract — Mutation-Level Gating Behavior

This feature does **not** introduce, remove, deprecate, rename, or change the type of any GraphQL field, argument, input, or enum. The committed `schema-baseline.graphql` is unchanged.

What changes is the **runtime behavior** of four existing mutations: under specified conditions they now reject requests they previously accepted. This document is the contract for that behavior change.

## Mutations affected

| Mutation | Trigger condition | Effect |
| --- | --- | --- |
| `createCalloutOnCalloutsSet` | `calloutData.framing.type == COLLABORA_DOCUMENT` **OR** `calloutData.settings.contribution.allowedTypes` contains `COLLABORA_DOCUMENT` | Gate evaluates target Collaboration's license; rejects with `LICENSE_ENTITLEMENT_NOT_AVAILABLE` (or `LICENSE_ENTITLEMENT_UNEVALUABLE` if license is unloadable) when `SPACE_FLAG_OFFICE_DOCUMENTS` is not enabled. |
| `createContributionOnCallout` | `contributionData.type == COLLABORA_DOCUMENT` | Gate evaluates the target Callout's parent Collaboration's license; same rejection contract. |
| `moveContributionToCallout` | source `Contribution.type == COLLABORA_DOCUMENT` | Gate evaluates the **target** Callout's parent Collaboration's license only. Source Collaboration state is ignored. |
| `updateCollaborationFromSpaceTemplate` | template body contains at least one callout where `framing.type == COLLABORA_DOCUMENT` **or** any allowed contribution type is `COLLABORA_DOCUMENT` | Gate runs as a pre-flight scan over the entire template body before any persistence. If any item triggers the gate and the target Collaboration is unentitled, the **entire** mutation is rejected atomically. No callouts are introduced. |

For all other mutation paths and all non-Collabora Document inputs, behavior is unchanged.

## Error contract

### User-facing error

Both rejection causes surface this **exact** message (FR-007 — pinned text) via the GraphQL error response:

```text
"Office Docs is not enabled for this Collaboration."
```

External callers cannot distinguish "entitlement absent" from "entitlement unevaluable" — this is intentional (FR-007).

### Internal exception types

| Cause | Exception class | GraphQL error code |
| --- | --- | --- |
| Entitlement is loaded and `enabled === false` | `LicenseEntitlementNotAvailableException` (existing) | `LICENSE_ENTITLEMENT_NOT_AVAILABLE` |
| `Collaboration.license` or `License.entitlements` cannot be loaded for the target Collaboration | `LicenseEntitlementUnevaluableException` (NEW) | `LICENSE_ENTITLEMENT_UNEVALUABLE` |

Both exceptions carry `details: { collaborationId: string }` so logs and metrics can correlate without leaking IDs into user-facing messages (constitution principle 5).

## Logging contract (FR-010)

| Cause | Log level | Log context | Log message |
| --- | --- | --- | --- |
| Entitlement enabled (allowed) | `debug` | `LogContext.LICENSE` | Static identifier `"office-docs-entitlement-allowed"`; `details.collaborationId` is structured |
| Entitlement absent (blocked) | `warn` | `LogContext.LICENSE` | Static identifier `"office-docs-entitlement-absent"`; `details.collaborationId` is structured |
| Entitlement unevaluable (blocked, fail-closed) | `error` | `LogContext.LICENSE` | Static identifier `"office-docs-entitlement-unevaluable"`; `details.collaborationId` is structured |

The allowed-path debug entry is required by constitution principle 5 (license-check decision points). No user-identifying data appears in any log message.

## Authorization layering (Edge Case)

Authorization runs **before** the entitlement check (existing pattern in resolver mutations). A user lacking the underlying privilege (e.g., `CREATE_CALLOUT`, `CONTRIBUTE`, `MOVE_CONTRIBUTION`, `UPDATE` on Collaboration) sees the existing authorization error first. The entitlement gate is reached only by callers who pass the auth check.

## Scope confirmation (no changes)

- Internal code paths (RabbitMQ message handlers, scheduled jobs, migrations, seed scripts, platform bootstrap) are **not** gated.
- No platform-admin bypass.
- No cross-collaboration license inheritance — the gate evaluates only the immediate target Collaboration's license.
- Existing Collabora Document callouts in unentitled Collaborations remain in place; only new introductions are blocked.
