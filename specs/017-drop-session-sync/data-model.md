# Data Snapshot: Session Sync Removal

## Removed Artifacts
- `SessionSyncModule`, `SessionSyncService`, and `KratosSessionRepository` have been deleted. No lifecycle or scheduler objects remain in the application graph.
- The `identity.authentication.providers.ory.session_sync` block and its env vars (`SESSION_SYNC_*`, `SYNAPSE_DB_*`, `SYNAPSE_OIDC_PROVIDER_ID`) no longer exist in config schemas or deployment templates.

## Remaining Constraints
- Alkemio continues to rely on Kratos/Synapse for authentication and messaging, but there is no direct SQL access to Kratos tables anymore.
- Shared Synapse components stay intact; only code with zero non-session-sync consumers was removed.
