# Research Findings: Session Sync Removal

## Decision 1: Remove Entire Session Sync Module Without Replacement
- **Decision**: Delete `SessionSyncModule`, `SessionSyncService`, and `KratosSessionRepository` with no substitute automation.
- **Rationale**: Code search confirmed the module is only referenced from `AppModule`; no other provider injects these types. Kratos session lifecycle is already enforced by Kratos itself, and Synapse session cleanup can be handled manually by admins when required.
- **Alternatives considered**:
  - Keep module but disable by config → Reject: retains dead code paths, adds maintenance burden.
  - Replace with generic scheduler hook → Reject: re-introduces same operational risk without clear owner.

## Decision 2: Prune `session_sync` Configuration Schema and Env Vars
- **Decision**: Remove `identity.authentication.providers.ory.session_sync` block from `AlkemioConfig`, `alkemio.yml`, `.env*`, and related docs; leftover env vars (if set) will simply be unused.
- **Rationale**: No other component reads these keys; removing them tightens config validation and reduces secrets surface. Allowing deployments to leave the env vars defined avoids breaking existing compose files during rollout.
- **Alternatives considered**:
  - Deprecate but keep schema until later release → Reject: adds follow-up debt and prolongs confusion.
  - Map env vars to new feature → Reject: no successor automation identified.

## Decision 3: Validate Synapse Integration Stability Post-Removal
- **Decision**: Keep `SynapseModule` untouched and run smoke tests ensuring other Synapse-dependent features (e.g., discussions, DM rooms) still bootstrap.
- **Rationale**: Session sync only depended on `SynapseAdminService` for terminating sessions; this service remains shared. Verifying the remaining consumers ensures there are no hidden coupling points.
- **Alternatives considered**:
  - Stub Synapse services during boot → Reject: would mask regressions and diverge from production wiring.
  - Add new health checks → Reject: unnecessary because removal reduces complexity; existing health indicators suffice.

## Confirmation: No Docs Advertise Session Sync
- **Check**: Searched `/docs` for `session sync`, `SessionSync`, `kratos-session` and found no references.
- **Conclusion**: Operational and user-facing manuals no longer mention automatic Kratos→Synapse session cleanup, satisfying T006.
