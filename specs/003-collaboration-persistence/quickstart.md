# Quickstart — Collaboration Persistence (server slice)

How to build, run, and test the touched paths. The module is the Alkemio `server`
(NestJS/TypeORM/GraphQL). **The slice is implemented in this PR — the commands below
describe the workflow against the delivered code.**

## Build / lint / test

```bash
pnpm install
pnpm run build          # tsc / nest build
pnpm run lint           # eslint — clean (constitution Code Quality)
pnpm run test           # vitest unit tests
pnpm run test:it        # integration tests (the harness that exercises RMQ handlers + DB)
```

## Migrations (the schema change)

```bash
# generate after editing memo.entity.ts / whiteboard.entity.ts
pnpm run migration:generate -- src/migrations/AddContentPointerAndBlobStore
# hand-edit the generated file to add the back-fill (content_pointer = id, blob_store = 'inline')
pnpm run migration:run        # apply
pnpm run migration:show       # verify applied
pnpm run migration:revert     # down() — must cleanly drop the 4 columns (SC-003)
pnpm run migration:validate   # schema matches entities
```

The migration adds `content_pointer` + `blob_store` to `memo` and `whiteboard`,
back-fills existing rows to `inline` + self-pointer, and reverts cleanly.

## Exercise the unified persistence contract

> Direction: the collaboration-service (caller) sends `collaboration-save` /
> `collaboration-fetch` to server (responder) over RabbitMQ. Locally, drive it via
> the integration test harness or a small RMQ client.

```text
# save (inline memo)
pattern: collaboration-save
payload: { id, contentType: "memo", version, contentPointer: id, blobStore: "inline", snapshotBase64 }
expect:  { data: { success: true } }   # index row upserted (version++), content column written

# save (offloaded whiteboard)
pattern: collaboration-save
payload: { id, contentType: "whiteboard", version, contentPointer: "<file-svc-id>", blobStore: "file-service" }
expect:  { data: { success: true } }   # index only; content column NOT written

# fetch
pattern: collaboration-fetch
payload: { id }
expect:  { data: { id, contentType, version, contentPointer, blobStore, authorizationPolicyId, snapshotBase64? } }
```

## Verify the lifecycle event

```text
# delete a memo/whiteboard (directly, or via deleting its parent Callout contribution/framing)
# assert: exactly one `document.deleted { id }` emitted on the collaboration queue
```
A unit test spies on the injected `COLLABORATION_SERVICE` `ClientProxy` and asserts
`emit('document.deleted', { id })` fires exactly once inside `deleteMemo` /
`deleteWhiteboard`, and not on a failed delete.

## Verify the authZ-eval path (OPEN-1 confirmation)

> The authorization-evaluation-service is a **separate** repo
> (`authorization-evaluation-service`). Run it pointed at server's DB.

```bash
# pick a memo with a known parent authorizationPolicyId P and an actor A
curl -s http://localhost:6060/internal/auth/evaluate \
  -H 'content-type: application/json' \
  -d '{"actorId":"<A>","privilege":"read","authorizationPolicyId":"<P>"}'
# expect { "allowed": <same as server in-process isAccessGranted(A, entity.authorization, READ)> }

curl -s http://localhost:6060/internal/auth/evaluate \
  -H 'content-type: application/json' \
  -d '{"actorId":"<A>","privilege":"update-content","authorizationPolicyId":"<P>"}'
# expect { "allowed": <same as in-process UPDATE_CONTENT check> }
```
The parity test (server-side, FR-008) asserts the auth-eval decision equals
`AuthorizationService.isAccessGranted` for the same actor/privilege/policy — proving
the path covers collab documents and pinning `read` / `update-content`.

## Run the migration read (one-time)

```bash
# the dedicated read path (server CLI standalone or guarded internal read) yields,
# for every memo + whiteboard: { id, contentType, content, authorizationPolicyId }
pnpm run cli -- collab:migration-export        # (name TBD; see tasks T005)
# the migration job (WS-E / collab v2 decoder) consumes this to seed the unified service
```

## Key tests (to be written — TDD)

| Behavior | Test (intended) |
|---|---|
| Schema migration up/down clean + back-fill | migration snapshot test |
| Unified save/fetch round-trip (inline memo) | `collaboration-save`/`-fetch` integration test |
| Offloaded save writes index only | DB-assertion test (content column empty) |
| `fetch` carries `authorizationPolicyId` | fetch-reply assertion |
| `document.deleted` emitted once on delete | ClientProxy spy in `deleteMemo`/`deleteWhiteboard` |
| authZ-eval parity with in-process check | cross-service parity test (read + update-content) |
| Migration read returns 100% of rows | migration-export completeness test |

The cross-repo migration round-trip (legacy blob → unified service → identical
render) is verified jointly with the collaboration-service's round-trip test (epic
SC-003) — it is not a server-only test.
