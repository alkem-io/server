# Local end-to-end testing — unified collaboration service (epic 003-unify-collab-yjs)

This runbook brings up the local dev stack with the **unified `collaboration`
service** in place of the two legacy backends (`whiteboard-collaboration-service`
and `collaborative-document-service`), and walks through verifying that
real-time collaboration works end to end on a **fresh** database.

> Scope: this is a dev/testing runbook for the server slice (WS-E). It assumes
> the server PR (#6171, branch `feat/003-unify-collab-yjs`) and the matching
> `client-web` branch `feat/003-unify-collab-yjs` are checked out.

---

## 0. What changed vs. the legacy stack

| | Legacy | Unified (this branch) |
|---|---|---|
| Whiteboard backend | `whiteboard-collaboration-service` :4002 (socket.io) | `collaboration` :4006 (raw WS, Yjs) |
| Memo backend | `collaborative-document-service` :4004 (hocuspocus) | `collaboration` :4006 (raw WS, Yjs) |
| Browser → backend path | Traefik `/api/private/ws` + `/api/private/hocuspocus` | Traefik `/collab/{documentId}` |
| Server ↔ backend | RMQ `alkemio-whiteboards` + `collaboration-document-service` | RMQ `alkemio-collaboration` (unified) |
| Snapshot blob | inline in main DB | file-service (`BLOB_STORE=file-service`) |

The browser **never** talks to the collaboration container directly — it goes
through Traefik (`localhost:3000`), which proxies `/collab/*` to
`collaboration:4006`. The server (running on the host at `:4000`) talks to the
collaboration container **only** over RabbitMQ (queue `alkemio-collaboration`),
never over WebSocket.

Compose service: `quickstart-services.yml` → `collaboration`
(image `ghcr.io/alkem-io/collaboration-service:pr-5`).
Traefik router: `.build/traefik/http.yml` → router `collaboration`
(`PathPrefix(\`/collab\`)` → service `collaboration` → `http://collaboration:4006/`).

### Alkemio-mode env (set in `quickstart-services.yml`)

```
PORT=4006
FANOUT_MODE=redis                 REDIS_URL=redis://redis:6379/0
METADATA_STORE=rabbitmq           RABBITMQ_QUEUE=alkemio-collaboration
BLOB_STORE=file-service           FILE_SERVICE_URL=http://file-service:4003
AUTH_MODE=authzeval               AUTH_SERVICE_URL=http://authorization-evaluation:6060
MAX_UPLOAD_SIZE=33554432
FILE_SERVICE_STORAGE_BUCKET_ID=${COLLAB_FILE_SERVICE_STORAGE_BUCKET_ID}   # filled post-seed
FILE_SERVICE_AUTHORIZATION_ID=${COLLAB_FILE_SERVICE_AUTHORIZATION_ID}     # filled post-seed
```

> The collaboration service validates its config at startup and **fails fast**
> if `BLOB_STORE=file-service` and either of the two file-service IDs is empty.
> That is intentional — the two IDs are seeded with **random UUIDs per DB reset**
> and must be filled in (step 3) before the container can start.

---

## 1. Fresh bring-up (clean volumes)

> The collaboration service needs **nothing** at first boot — rooms materialize
> lazily on the first authenticated WS connect, and the metadata row is written
> on the first debounced save. No migration is required (migration of legacy
> content is deferred and out of scope for this test).

From the server worktree root:

```bash
cd ~/work/alkemio/worktrees/003-unify-collab-yjs/server

# Tear down EVERYTHING incl. volumes (fresh data).
docker compose -f quickstart-services.yml --env-file .env.docker down -v

# Bring the infra + sidecars up (postgres, rabbitmq, redis, traefik,
# file-service, authorization-evaluation, kratos/hydra/oathkeeper, collaboration…).
pnpm run start:services
```

Because `FILE_SERVICE_STORAGE_BUCKET_ID` / `FILE_SERVICE_AUTHORIZATION_ID` are
still blank, the `collaboration` container will **crash-loop** at this point.
That is expected — it comes up healthy after step 3. Everything else starts
normally.

Validate the compose file at any time (no bring-up):

```bash
docker compose -f quickstart-services.yml --env-file .env.docker config -q
```

---

## 2. Seed the database + start the server

The repo already ships a one-shot reset script that wipes volumes, runs
migrations, starts the dev server on the host (`:4000`), and registers the admin
user via Kratos + MailSlurper:

```bash
# Requires a .env file with AUTH_ADMIN_PASSWORD (the script reads it from .env,
# NOT .env.docker). .env.docker carries AUTH_ADMIN_EMAIL=admin@alkem.io /
# AUTH_ADMIN_PASSWORD=password as the dev defaults — mirror the password into
# .env if you don't have one:
grep -q '^AUTH_ADMIN_PASSWORD=' .env 2>/dev/null || echo 'AUTH_ADMIN_PASSWORD=password' >> .env

.scripts/reset-db.sh
```

`reset-db.sh` does: `down -v` → `start:services` → wait for Postgres →
`migration:run` → `start:dev` (background, logs to `/tmp/alkemio-dev-server.log`)
→ wait for Kratos + GraphQL → `register-user.sh admin@alkem.io …`.

If you prefer to drive it manually:

```bash
docker compose -f quickstart-services.yml --env-file .env.docker down -v
pnpm run start:services
# wait for postgres healthy, then:
pnpm run migration:run
pnpm start:dev        # host server on :4000 (Traefik proxies it on :3000)
# register a user (see step 5)
```

The migration that matters is `…-seed.ts`, which creates the **platform storage
aggregator** (`type='platform'`) with its **direct storage bucket** and that
bucket's authorization policy — the two UUIDs the collaboration service needs.

---

## 3. Extract + wire the file-service IDs (the only manual step)

After seeding, pull the platform direct storage bucket UUID and its authorization
policy UUID out of the DB and put them into `.env.docker`, then recreate the
`collaboration` container so it boots healthy.

```bash
# Both IDs in one query (psql inside the postgres container):
docker exec alkemio_dev_postgres psql -U synapse -d alkemio -tA -c "
  SELECT sb.id || ' ' || sb.\"authorizationId\"
  FROM storage_bucket sb
  JOIN storage_aggregator sa ON sb.id = sa.\"directStorageId\"
  WHERE sa.type = 'platform';"
# → prints:  <storage_bucket_id> <storage_bucket_authorization_id>
```

Set the two values in `.env.docker`:

```bash
# replace the two empty assignments
COLLAB_FILE_SERVICE_STORAGE_BUCKET_ID=<storage_bucket_id>
COLLAB_FILE_SERVICE_AUTHORIZATION_ID=<storage_bucket_authorization_id>
```

Recreate just the collaboration container so it picks up the new env:

```bash
docker compose -f quickstart-services.yml --env-file .env.docker up -d --force-recreate collaboration
```

> Why this is manual: the seed uses `randomUUID()` for both the bucket and its
> authorization policy, so the values differ on every `down -v` / reset. They are
> **references, not secrets** (file-service does not validate that the bucket row
> exists — it stores documents under whatever UUIDs the caller supplies), but
> using the real platform bucket keeps the blobs consistent with the rest of the
> platform's storage. See the "Assumptions / risks" section for the
> `BLOB_STORE=inline` shortcut that skips this step entirely.

---

## 4. Verify the collaboration service is reachable

### 4a. Container health + topology

```bash
docker logs alkemio_dev_collaboration --tail 40
# expect a startup line naming the topology:
#   FANOUT_MODE=redis METADATA_STORE=rabbitmq BLOB_STORE=file-service AUTH_MODE=authzeval
docker ps --filter name=alkemio_dev_collaboration   # should be Up (not restarting)
```

### 4b. Health + metrics (direct, inside the docker network)

```bash
# /healthz → {"status":"ok"}   /metrics → Prometheus exposition
docker exec alkemio_dev_collaboration wget -qO- http://localhost:4006/healthz ; echo
docker exec alkemio_dev_collaboration wget -qO- http://localhost:4006/metrics | grep collaboration_rooms_active
```

### 4c. WS smoke against `/collab/{id}` through Traefik

The unified provider's path is `/collab/<documentId>?type=memo|whiteboard`, and
the Traefik `collaboration` router forwards it verbatim. AuthN happens at the
handshake: in `authzeval` mode the service reads the `Authorization` header as
the **actor id** (Traefik's `oathkeeper-auth-socket-io` forwardAuth injects it).

Quick "does it upgrade" check (no auth → expect 401, proving the route + auth
gate are wired):

```bash
# Through Traefik on :3000 — no Authorization header ⇒ handshake rejected (401).
curl -i -N \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  'http://localhost:3000/collab/00000000-0000-0000-0000-000000000001?type=memo'
# → HTTP/1.1 401 (route reached, auth enforced).  A 404 here would mean the
#   Traefik router didn't match — re-check .build/traefik/http.yml.
```

A full authenticated WS round-trip is easiest from the browser (step 6); for a
scripted y-protocols handshake, point a `y-websocket` Node client at
`ws://localhost:3000/collab/<docId>?type=memo` with the `Authorization` header
set to a valid actor id (the same value Oathkeeper would resolve).

To isolate the WS/Yjs path from auth entirely, temporarily run the service with
`AUTH_MODE=open` (any handshake accepted) — see "Assumptions / risks".

---

## 5. Register a test user + grant admin (direct SQL)

`reset-db.sh` already registers `admin@alkem.io`. To register another user, or
to do it by hand:

```bash
# Register + verify via Kratos + MailSlurper (the helper reads the password from
# a temp file to avoid shell-escaping the '!'):
echo -n 'password' > /tmp/.register-password
.scripts/register-user.sh 'tester@alkem.io' 'Test' 'User'
# MailSlurper UI (verification mails): http://localhost:4436
```

`register-user.sh` only registers + verifies the Kratos identity and creates the
Alkemio user; it does **not** grant any platform role. Grant global-admin via
direct SQL (a user is an `actor`, so `user.id == actor.id`; the grant is a
`credential` row of `type='global-admin'` linked to that actor):

```bash
docker exec alkemio_dev_postgres psql -U synapse -d alkemio -c "
  INSERT INTO credential
    (id, \"createdDate\", \"updatedDate\", version, \"resourceID\", type, \"actorId\")
  SELECT uuid_generate_v4(), now(), now(), 1, '', 'global-admin', u.id
  FROM \"user\" u
  WHERE u.email = 'admin@alkem.io'
  ON CONFLICT DO NOTHING;"
```

(Swap the email for whichever user you want to elevate. `resourceID=''` and the
`type='global-admin'` value match the platform role catalog seeded by
`…-seed.ts`.)

Web client + login: open `http://localhost:3000`, sign in with the registered
credentials.

---

## 6. End-to-end collaboration check (memo)

> **Only the memo path is end-to-end testable on this branch right now.** The
> client-web memo editor already uses the `UnifiedCollabProvider`. The whiteboard
> editor still uses the legacy socket.io client and is blocked on the
> excalidraw-fork binding package publish (US1) — see "Assumptions / risks".

### 6a. Point client-web at the unified service (client-web repo)

In `client-web` (branch `feat/003-unify-collab-yjs`), set the memo collab env to
the unified `/collab` path. These live in **both** `.env` and
`public/env-config.js` (the runtime `window._env_`); change both:

```
# client-web/.env  and  client-web/public/env-config.js
VITE_APP_COLLAB_DOC_URL=http://localhost:3000
VITE_APP_COLLAB_DOC_PATH=/collab
# (whiteboard vars — set in anticipation; not functional until the binding lands)
VITE_APP_COLLAB_URL=http://localhost:3000
VITE_APP_COLLAB_PATH=/collab
```

The `UnifiedCollabProvider` (y-websocket) builds the final URL as
`<DOC_URL><DOC_PATH>/<documentId>?type=memo` →
`ws://localhost:3000/collab/<memoId>?type=memo`, which Traefik routes to
`collaboration:4006`. Restart the client dev server after editing.

### 6b. Drive it

1. Open a memo (e.g. a Space description / a callout memo) in **two** browser
   profiles/windows, both signed in.
2. Type in one — the other converges within ~1s.
3. Stop typing; after the debounce window the service persists a snapshot:
   - control message `saved` reaches the client,
   - blob is PUT to file-service, and
   - the index row is upserted on the server over RMQ.

### 6c. Confirm the server RMQ save/fetch round-trip

The collaboration service is the RMQ **client**; the server (this PR) is the
**responder** on queue `alkemio-collaboration`
(`src/services/collaboration-integration/`), wired in `src/main.ts`
(`connectMicroservice(app, …, MessagingQueue.COLLABORATION_SERVICE)`).

- **Save** (`collaboration-save`): after editing + debounce, a metadata/index row
  is upserted. Verify the row landed (the memo's persisted document/version):

  ```bash
  # Server log shows the responder handling collaboration-save / -fetch.
  grep -iE 'collaboration-(save|fetch|info)' /tmp/alkemio-dev-server.log | tail
  ```

- **Fetch** (`collaboration-fetch`): reload the memo in a fresh window → the room
  is cold, so the service issues `collaboration-fetch`, the server returns the
  index (`contentPointer`/`blobStore`/`version`), the service pulls the blob from
  file-service and rehydrates the doc → your text is still there. The
  `version` the room sent on save is round-tripped back verbatim.

- **RabbitMQ** queue/traffic: management UI at `http://localhost:15672`
  (`alkemio-admin` / `alkemio!`) → Queues → `alkemio-collaboration`.

---

## 7. Tear down

```bash
docker compose -f quickstart-services.yml --env-file .env.docker down -v   # incl. volumes
```

---

## The collaboration PR image

- Tag: **`ghcr.io/alkem-io/collaboration-service:pr-5`** — the OPEN-1 PR
  (collaboration-service [#5](https://github.com/alkem-io/collaboration-service/pull/5),
  `feat(WS-C): control-message reason codes (OPEN-1)`), which is waves 1–4 plus
  the client-facing auth-control `reason` field. The `pr-<N>` tag tracks the
  latest push on that PR.
- How it's built: the PR workflow `.github/workflows/build-push-ghcr-pr.yml` calls
  the reusable `antst/alkemio-github-workflows/.github/workflows/container-pr.yml@v1`
  on every PR open/synchronize/reopen and pushes the multi-arch `pr-<N>` image.
- Confirm it built: `gh pr checks 5 --repo alkem-io/collaboration-service` — the
  `image / build (linux/amd64…)`, `image / build (linux/arm64…)` and
  `image / merge` jobs are green (the failing `integration-coverage` job is a
  coverage gate, not the image build, and does not block the push).
- Confirm the tag is in the registry:
  `docker manifest inspect ghcr.io/alkem-io/collaboration-service:pr-5`.

> Repin to a fixed digest once PR #5 settles, so the dev stack doesn't silently
> move when the PR is pushed again. PR #5 is currently stacked on
> `feat/003-wave4` (not yet on `develop`).

---

## Assumptions / risks (confirm before relying on a green run)

1. **AuthN header parity.** In `authzeval` mode the service treats the
   `Authorization` header value **verbatim as the actor id**
   (`internal/adapter/outbound/auth/authzeval/auth.go` `Authenticate`). The
   `/collab` Traefik router reuses the legacy whiteboard route's
   `oathkeeper-auth-socket-io` forwardAuth to inject `Authorization`. This
   assumes Oathkeeper resolves that header to the **same actor-id form** the
   service expects (the legacy whiteboard-collaboration-service consumed the same
   header, so parity is likely — but verify with one real authenticated WS
   handshake). If the value is a JWT/other shape rather than a bare actor id,
   the authzeval adapter would use the whole string as the actor id and the
   downstream `/internal/auth/evaluate` call would fail closed (403).

2. **Whiteboard collab is NOT testable yet.** client-web's whiteboard editor
   still uses the legacy socket.io client (`getCollabServer` /
   `excalidraw/collab/Portal.ts`), which pointed at the now-removed
   `/api/private/ws` backend. The unified whiteboard path is blocked on the
   excalidraw-fork binding package publish (US1). Until then, only **memo**
   collaboration works end to end. Pointing `VITE_APP_COLLAB_URL/PATH` at
   `/collab` is forward-looking, not functional.

3. **`MAX_DOC_BYTES` / per-room limit env vars are inert.** The configmap
   documents `MAX_DOC_BYTES`, `MAX_CONNS_PER_ROOM`, `UPDATE_RATE_PER_SEC`,
   `COLLABORATOR_INACTIVITY_SECONDS`, `CONTRIBUTION_WINDOW_SECONDS`, but the
   service binary (`internal/config/config.go`) does **not** read them today —
   the limits use built-in defaults. They are intentionally omitted from the
   compose env to avoid implying they take effect. (file-service offload uses
   `MAX_UPLOAD_SIZE`, which *is* read.)

4. **authZ service hostname.** The k8s configmap uses
   `authorization-evaluation-service:6060`; the dev compose hostname is
   `authorization-evaluation` (no `-service` suffix). The compose env uses the
   dev hostname.

5. **Fast path to isolate WS/Yjs from infra.** If you only want to prove the
   real-time sync path and skip the file-service IDs + authZ entirely, run the
   collaboration container with the zero-dependency standalone modes:
   `AUTH_MODE=open`, `BLOB_STORE=inline`, `METADATA_STORE=inmemory`,
   `FANOUT_MODE=inmemory`. It boots with no DB/bus/file-service wiring and any
   WS handshake is accepted — useful to confirm `/collab/{id}` convergence before
   layering auth + persistence back on. (Persistence won't survive a restart in
   this mode.)

6. **No migration on first boot.** This runbook deliberately starts from empty
   volumes; legacy memo/whiteboard content migration is out of scope. Rooms
   lazily materialize, so a fresh stack needs nothing pre-provisioned beyond the
   two file-service reference IDs (step 3).
