# T033b - Account Deletion Propagation Test

**Requirement**: FR-015 – Matrix sessions terminate within 5 minutes when the Kratos account is deleted or disabled.

**Date**: 2025-10-22

## Test Environment

- Docker compose quickstart (`quickstart-services.yml`)
- Synapse service exposed via Traefik (`http://localhost:3000`)
- Hydra + Kratos stack from feature branch `010-synapse-kratos-oidc`
- Session sync interval: 120 seconds (override `SESSION_SYNC_INTERVAL_MS=120000`)

## Preconditions

1. Kratos, Hydra, Synapse, and alkemio-server containers running.
2. OIDC integration already verified (User Story 1 complete).
3. Session synchronization enabled (`SESSION_SYNC_ENABLED=true`).
4. Test Matrix user `@fr015test:localhost` authenticated via OIDC and active Matrix session confirmed (message posted in reference room).

## Steps

1. **Baseline activity**
   - Send a message from the test Matrix user to confirm active session.
   - Verify message delivered. _(Pass)_
2. **Delete Kratos identity**
   - Call Kratos Admin API:
     ```bash
     curl -X DELETE \
       http://localhost:4434/admin/identities/<IDENTITY_ID>
     ```
   - Response `204 No Content`. _(Pass)_
3. **Wait for session sync job**
   - Observe alkemio-server logs for `Kratos session sync finished` entry.
   - Log shows `processed=1`. _(Pass)_
4. **Verify Matrix session termination**
   - Attempt to send another message from the same Matrix client (Element Web).
   - Client prompts re-authentication within 2 minutes.
   - Synapse admin API shows zero devices for the user:
     ```bash
     curl -H "Authorization: Bearer $SYNAPSE_ADMIN_TOKEN" \
       http://localhost:3000/_synapse/admin/v2/users/%40fr015test%3Alocalhost/devices
     ```
     Response `devices: []`. _(Pass)_

## Observations

- `SessionSyncService` log excerpt:
  ```
  INFO [oidc] Processing 1 expired Kratos sessions
  INFO [oidc] Kratos session sync finished: processed=1, duration=428ms, intervalMs=120000
  ```
- Synapse Admin API deletion log indicates two devices removed (web + mobile).
- No residual access tokens in `access_tokens` table for the user.

## Result

✅ **PASS** – Matrix session terminated within 2 minutes of Kratos identity deletion, satisfying FR-015.

## Notes

- Manual test executed twice to confirm deterministic behaviour.
- Session sync interval kept short for validation; production interval remains 300 seconds.
- Follow-up: monitor Grafana once authentication dashboard (T035) is implemented.
