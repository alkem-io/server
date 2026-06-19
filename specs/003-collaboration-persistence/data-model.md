# Data Model — Collaboration Persistence (server slice, Phase 1)

Two layers: the **TypeORM entity/column changes** (the metadata/index, server-owned)
and the **unified message schemas** (the request/reply + lifecycle wire shapes). The
epic `data-model.md` (`../agents-hq/specs/003-unify-collab-yjs/data-model.md`) is
authoritative for the CRDT document conventions (inside the `Y.Doc`); this file is
the **server storage view**. All paths relative to the repo root.

## Entity changes (TypeORM)

### Memo — `src/domain/common/memo/memo.entity.ts`

Current content-bearing column (unchanged):

| field | TypeORM | DB type | nullable | notes |
|---|---|---|---|---|
| `content` | `@Column('bytea')` | `bytea` | yes | Yjs **v2** binary state (`Y.encodeStateAsUpdateV2`); base64 on the wire. The **inline** blob. |

Inherited (via `NameableEntity → AuthorizableEntity → BaseAlkemioEntity`):
`id` (uuid), `version` (int, `@VersionColumn`), `createdDate`/`updatedDate`,
`authorizationId` (uuid FK → `AuthorizationPolicy`), `nameID`, `profileId`,
`createdBy`, `contentUpdatePolicy` (varchar enum).

**New columns:**

| field | TypeORM | DB type | nullable | default | notes |
|---|---|---|---|---|---|
| `contentPointer` | `@Column('varchar', {length: UUID_LENGTH, nullable: true})` | `varchar` | yes | back-fill `= id` | locator into the blob store; for `inline`, the memo id (the row itself) |
| `blobStore` | `@Column('varchar', {length: ENUM_LENGTH, nullable: true})` | `varchar` | yes | back-fill `'inline'` | which adapter holds the blob: `inline`\|`file-service`\|`s3`\|`local`; persisted so a doc rehydrates from the right backend regardless of running config |

> When `blobStore = 'inline'`, the snapshot lives in `content` (today's behavior) and
> `contentPointer = id`. When `blobStore != 'inline'`, `content` is empty/unused and
> the snapshot lives in the collab-side BlobStore keyed by `contentPointer`.

### Whiteboard — `src/domain/common/whiteboard/whiteboard.entity.ts`

Current content-bearing column (unchanged):

| field | TypeORM | DB type | nullable | notes |
|---|---|---|---|---|
| `content` | `@Column('text')` | `text` | no | Excalidraw JSON, **gzip-compressed** by `@BeforeInsert/@BeforeUpdate` (`compressText`), decompressed by `@AfterLoad` (`decompressText`). The **inline** blob. |

> Note: the whiteboard `content` is `NOT NULL` today. If a board is fully offloaded
> (`blobStore != 'inline'`), the migration must decide whether `content` becomes an
> empty string or the column is relaxed to nullable. **Decision for v1: keep `content`
> NOT NULL; offloaded whiteboards store `''` inline + the real bytes via the pointer.**
> (Avoids a NOT-NULL relaxation; revisit if it bloats rows.)

Inherited columns: same set as Memo.

**New columns:** identical to Memo (`contentPointer`, `blobStore`).

### AuthorizationPolicy (referenced, unchanged) — `src/domain/common/authorization-policy/authorization.policy.entity.ts`

- `id` (uuid, from `BaseAlkemioEntity`) — **this is the `authorizationPolicyId`** the
  auth-eval-service evaluates against.
- Linked from `Memo`/`Whiteboard` via `AuthorizableEntity.authorization` (`@OneToOne`,
  FK column `authorizationId`, `cascade:true`, `onDelete:'SET NULL'`). No change here;
  the persistence index simply **surfaces** `authorizationId` as `authorizationPolicyId`.

### Conceptual: CollaborationMetadata (index projection)

Not a new table in v1 — a *projection* over the entity columns the unified `fetch`
returns:

| field | source | notes |
|---|---|---|
| `id` | `Memo.id` / `Whiteboard.id` | single id namespace (memo + whiteboard) |
| `contentType` | which entity it is | `memo` \| `whiteboard` |
| `version` | `entity.version` | bumped on each save (TypeORM `@VersionColumn`); forward-compatible with a version timeline (FR-025) |
| `contentPointer` | `entity.contentPointer` | inline ⇒ `id` |
| `blobStore` | `entity.blobStore` | `inline` default |
| `authorizationPolicyId` | `entity.authorizationId` | the policy id for authZ-eval (FR-005, OPEN-1) |
| `ownerRef` | parent Callout framing/contribution | the lifecycle owner (FR-023); the delete cascade keys off the entity's own delete, so `ownerRef` is informational |
| `createdAt`/`updatedAt` | `entity.createdDate`/`updatedDate` | |

## Migration

One reversible TypeORM migration (`src/migrations/<ts>-AddContentPointerAndBlobStore.ts`):

- **up():** `ALTER TABLE memo ADD COLUMN content_pointer varchar(36) NULL`,
  `ADD COLUMN blob_store varchar(128) NULL`; same for `whiteboard`; then back-fill:
  `UPDATE memo SET content_pointer = id::varchar, blob_store = 'inline'`;
  `UPDATE whiteboard SET content_pointer = id::varchar, blob_store = 'inline'`.
- **down():** drop the four columns.
- Idempotent + tested on a schema snapshot (constitution Architecture §3; SC-003).
- Generated via `pnpm run migration:generate`, hand-reviewed (TypeORM's generator
  may not infer the back-fill — add it by hand).

## Unified message schemas (wire)

> **Direction (DEC-3):** server is the **responder**; the collaboration-service is
> the caller. Patterns hosted as `@MessagePattern` on a collaboration queue. **The
> exact pattern names + payload are pending the joint freeze with the collab Wave-2
> adapter (spec ⚠️ / OPEN-3).** Shapes below are the proposal.

### `collaboration-save` (collab → server, RPC request/reply)

Request:
```jsonc
{
  "id": "string (uuid)",                 // document id (memo or whiteboard)
  "contentType": "memo | whiteboard",
  "version": 12,                          // the version the snapshot was produced at
  "contentPointer": "string",            // inline ⇒ = id; else blob-store locator
  "blobStore": "inline | file-service | s3 | local",
  "snapshotBase64": "string?"            // present iff blobStore == 'inline' (v2 bytes)
}
```
Reply (mirrors today's `SaveOutputData` shape):
```jsonc
{ "data": { "success": true } }
// or
{ "data": { "error": "string", "code": "not_found | internal_error | forbidden" } }
```
Server behavior: upsert the index row (version++); if `blobStore == 'inline'` write
`content` from `snapshotBase64`, else leave `content` untouched/empty and store only
`contentPointer` + `blobStore`.

### `collaboration-fetch` (collab → server, RPC request/reply)

Request:
```jsonc
{ "id": "string (uuid)" }
```
Reply:
```jsonc
{
  "data": {
    "id": "string",
    "contentType": "memo | whiteboard",
    "version": 12,
    "contentPointer": "string",
    "blobStore": "inline | file-service | s3 | local",
    "authorizationPolicyId": "string (uuid)",   // FR-005, OPEN-1
    "snapshotBase64": "string?"                  // present iff blobStore == 'inline'
  }
}
// or
{ "data": { "error": "string", "code": "not_found | internal_error" } }
```

### Carried-forward auxiliary patterns (unchanged in spirit)

- `info` → `{read, update, maxCollaborators, isMultiUser?}` — the collaborator-mode
  inputs. *May be superseded by the auth-eval path; the collab service may compute
  read/update via authZ-eval instead of this RPC.* Keep during cutover; confirm in
  OPEN-1/OPEN-4 follow-up.
- `contribution` (event) → `{id, users[]}` — the north-star analytics signal; the
  collab service emits it (its OPEN-4). Server's `ContributionReporterService`
  continues to consume it.

### Lifecycle events (server → collab) — `contracts/lifecycle-events.md`

```jsonc
// document.deleted  (REQUIRED — emitted at the delete cascade leaves)
{ "id": "string (uuid)" }

// document.created  (OPTIONAL — pre-register metadata)
{ "id": "string", "contentType": "memo | whiteboard", "ownerRef": "string" }

// document.access_changed  (OPTIONAL — re-evaluate connected clients)
{ "id": "string" }
```
Transport: RabbitMQ, the same bus as persistence; fire-and-forget `emit` via the new
`COLLABORATION_SERVICE` outbound client. `document.deleted` is idempotent downstream.

## Validation / rules

- `blobStore` MUST be one of the enum values; an unknown value is an
  `internal_error` reply (fail loud, don't silently inline).
- `version` is monotonic per document (TypeORM `@VersionColumn` semantics).
- A `fetch` for an absent id → `not_found` (no exception leak; mirror today's
  `FetchErrorCodes.NOT_FOUND`).
- Inline invariant: `blobStore == 'inline'` ⟺ `contentPointer == id` ⟺ blob in
  `content`. The migration back-fill establishes this for all existing rows.
- Whiteboard `content` stays NOT NULL; offloaded whiteboards store `''` inline.
- The `authorizationPolicyId` returned MUST be the entity's own `authorizationId`
  (CS-3/OPEN-1); never a guessed/parent id (confirm no stale-vs-parent case, OPEN-1
  residual).

## References

- Epic conventions + schema: `../agents-hq/specs/003-unify-collab-yjs/data-model.md`
- Persistence contract: `../agents-hq/specs/003-unify-collab-yjs/contracts/persistence-ports.md`
- Lifecycle contract: `../agents-hq/specs/003-unify-collab-yjs/contracts/lifecycle-events.md`
- Collab-service data model (counterpart): `../collaboration-service/specs/001-collaboration-server/data-model.md`
- Current entities: `src/domain/common/memo/memo.entity.ts`, `src/domain/common/whiteboard/whiteboard.entity.ts`
- Current consumers: `src/services/{collaborative-document-integration,whiteboard-integration}/`
