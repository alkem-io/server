# Conversation Media Attachments

> Feature `013-matrix-media-file-service`. Cross-repo spec:
> `../agents-hq/specs/013-matrix-media-file-service/`.

Lets users attach images/files/audio/video to conversation messages from both the
web client and native Element, with every media file stored **once** through
file-service and governed by chat membership.

Alkemio is a **tiered client of Synapse here, not a replacement for it**: Synapse
owns the media blob and its lifecycle; the server owns placement (which Alkemio
bucket a file lives in), authorization, and the read model.

## Rollout

There is **no feature flag** — the behaviour is unconditionally on. Rollout is
controlled by **deployment order**: the Synapse storage provider, file-service
and matrix-adapter must be in place before the server code that depends on them.

## Storage model

- **Conversation bucket** — every `Conversation` gets a `StorageAggregator`
  (`StorageAggregatorType.CONVERSATION`) + one bucket, created eagerly in
  `ConversationService.createConversation` and parented to the platform
  StorageAggregator. A backfill migration creates them for pre-existing
  conversations. Bucket policy: a curated safe MIME set
  (`CONVERSATION_MEDIA_ALLOWED_MIME_TYPES` — images/audio/video/common docs;
  executables/scripts/unknown rejected) and a 50 MiB cap.
- **Authorization** — the bucket auth is RESET + INHERITED from the
  Conversation's own (membership-based) authorization in
  `ConversationAuthorizationService`, which itself resets before rebuilding the
  participant rule, so a removed member loses access everywhere the policy
  cascades. READ on attachments is therefore granted to exactly the conversation
  members and follows membership changes live. The generic StorageAggregator auth
  is deliberately **not** used (it would grant registered/anonymous READ).
  A conversation backfilled by the migration starts with an EMPTY bucket policy
  until the next auth reset runs; `Conversation.storageBucket` resolves to `null`
  in that window rather than failing the query.
- **`matrix_media` staging bucket** — a reserved platform-level bucket
  (fixed id `00000000-0000-4000-8000-000000000013`, config
  `storage.file_service.matrix_media_bucket_id`). The Synapse storage provider
  creates inbound Matrix media here first; the server re-homes rows out of it.
  Rows the provider creates carry no server-side tagset, which is a valid state.
  The bucket carries **no** Alkemio policy — empty `allowedMimeTypes`, zero
  `maxFileSize` — because it receives every local Synapse media upload, in every
  room on the homeserver. Alkemio's conversation policy constrains what Alkemio
  surfaces, never what Synapse accepts.
- **Comment rooms** — callout/post comment rooms are supported and target the
  parent callout's existing collaboration bucket (no new bucket is created), for
  both the outbound send path and the inbound re-home.

## Outbound (web compose)

`RoomSendMessageInput.attachments: [UUID!]` (≤10, `@ArrayUnique`) carries
file-service document ids previously uploaded into the target bucket
(`temporaryLocation: true` until send). On send,
`MessageAttachmentService.resolveOutboundAttachments` validates, without mutating
anything: count ≤ 10, the document is in this room's bucket, it is owned by the
sender, it is still temporary (single-use), the sender has READ, and its
type/size satisfy the bucket policy. It then threads `AttachmentRef`s to
matrix-adapter via `SendMessageRequest.attachments`; the adapter embeds
`io.alkemio.document_id` on the outbound `m.image`/`m.file` event.

For **image** attachments the refs also carry `width`/`height`, sourced from
file-service's by-id meta endpoint (`getDocumentMeta`) — the intrinsic dims are
transient, file-service-owned fields, so the DB load above leaves them undefined.
They become the outbound `m.image` event's `info.w`/`info.h`, which is what stops
Element (and every other Matrix client) reflowing its layout as the image loads;
Element populates them for its own uploads, so omitting them would make us the
worse client. The fan-out is hard-bounded — at most 10 attachments, one message
at a time — and the fetches run in parallel after validation, so the worst case
adds one short timeout, not ten. The lookup is best-effort and isolated (short
timeout, zero retries, deliberate bypass of the shared file-service circuit
breaker): any failure just leaves the dims undefined and can never fail or block
the send.

Documents are pinned durable (`temporaryLocation: false`) only **after** the send
is confirmed, so a failed send leaves nothing pinned. Three anchors make the pin
robust:

1. `persistOutboundAttachments` — the inline post-send flip (best-effort);
2. `coalesceOutboundEcho` — the delivery echo arrives on the retried MQ channel
   and pins the document if it is still temporary;
3. the outbound **read-heal** — any read that resolves a delivered message's
   still-temporary document pins it.

Only if all three fail *and* the conversation goes unread for 24h can the staging
sweep reap a delivered attachment.

## Inbound (Element-origin) — eager re-home

On `communication.message.received`,
`MessageAttachmentService.rehomeInboundAttachments` processes each attachment
**eagerly** so reads are plain lookups. There are two kinds:

- **Outbound echo** (carries `document_id`) — the conversation document already
  exists. `coalesceOutboundEcho` stamps `externalReference = media_id` onto it,
  deletes the redundant `matrix_media` staging twin the Synapse provider minted
  for the same blob (this is what makes "stored once" true), and applies the
  delivery pin. Guarded by bucket-membership + sender-ownership checks, because
  both ids come from an attacker-influenceable Matrix event.
- **Inbound** (carries `media_id` only) — re-home into the target bucket:
  - still in `matrix_media` staging → **MOVE**, minting a DOCUMENT auth that
    inherits the bucket auth, setting `createdBy = sender`, keeping
    `externalReference = media_id`, and restoring the human filename from the
    event `body` (sanitized — see `sanitizeAttachmentDisplayName`; the provider
    only ever knew the opaque media id);
  - already homed elsewhere (re-share) → **COPY** (zero-copy, shared blob).

Media is stored **VERBATIM** — no transcoding, no EXIF stripping, no re-encoding
(spec D6). HEIC and other unrenderable formats are moved byte-exact; file-service
serves a web-renderable rendition at read time. Inbound media is validated
against the **target bucket policy** (MIME allow-list + size cap) before
re-homing; media that fails is left in staging and logged, so Element users are
unaffected while the web client simply omits that one attachment.

Idempotent: a second receive finds the document already in the target bucket.
Concurrent re-homes of the same media are collapsed by a per-process
single-flight; cross-pod duplicates on the COPY branch are an accepted residual.

If the eager re-home fails, the read path **self-heals**: a bucket-scoped miss
lazily re-homes and re-resolves, so a transient failure never makes an attachment
permanently invisible.

## Read resolution

`Message.attachments` (`@ResolveField`) resolves, READ-gated, to
`MessageAttachment { id, url, displayName, mimeType, size, width, height }`:

- outbound via the event's `io.alkemio.document_id`, gated on bucket membership
  **and** sender ownership (that branch can address any document in the bucket by
  id, including never-shared staging uploads);
- inbound via `(bucket, media_id)`, resolved from the server's own DB in a single
  batched query per message and gated on the document being **durable** — a
  still-staged document is somebody's unsent upload and is never surfaced.
  Ownership is deliberately *not* required here, so a legitimate re-share by a
  second member resolves, matching how Element/Synapse treat `mxc://` references.

`width`/`height` come **straight off the Matrix event** (`info.w`/`info.h`),
exactly as Element and every other Matrix client renders them. There is no
measurement, no batching and no round-trip: the server accepts what the event
asserts. A value the GraphQL `Int` field cannot represent — non-integer,
non-finite, out of the signed 32-bit range — or a non-positive one counts as
**absent**, so a crafted `info.w` can never fail the read; the attachment simply
resolves dimensionless.

The only harm a wrong `info.w`/`info.h` can do is make the sender's *own* image
lay out slightly wrong in the viewer — cosmetic and self-inflicted, which is why
second-guessing it is not worth a parallel measurement pipeline. Note the
asymmetry with the send path above: *asserting* dims on our own uploads is what
every Matrix client does and costs a bounded ≤10 fetches per send; *re-measuring*
somebody else's would cost an unbounded fetch per attachment of unpaginated
history, for no benefit.

Failures degrade rather than propagate: an unresolvable bucket, a failed batch
lookup, or a single bad attachment omits *that* attachment (or that message's
attachments) and is logged — it never fails the surrounding `getMessages` query.

`RoomResolverFields.messages` resolves the room's bucket once for the whole
message list, so the per-message resolver does no repeated room→bucket lookups.

## Lifecycle

- **Media deletion / GC is Synapse's job.** Message deletion is per-event
  redaction and Synapse retention/purge governs the blob, so the server does
  **not** release or delete attachment media when a message is deleted. This is a
  settled scope decision, not a gap.
- **Staging cleanup** — `MessageAttachmentCleanupService` (daily cron,
  cross-replica claimed) releases only **unsent conversation-bucket uploads**
  older than 24h
  (`temporaryLocation: true` + aggregator type `CONVERSATION`). It deliberately
  does **not** age-sweep `matrix_media` staging rows — those back live Synapse
  media, and reaping them by age would lose data and break Element reads;
  provider-staging GC belongs to file-service/the provider. Comment-room uploads
  live in the parent collaboration bucket and are likewise not age-swept.
- **Staging twin coalesce** — the one server-side deletion in the feature: the
  redundant `matrix_media` row for a web-originated upload, removed once the
  conversation document carries its `externalReference` (the blob survives).
- **Conversation deletion** — the conversation's storage aggregator (bucket +
  documents + auth) is torn down before its authorization policy is removed, so a
  failed remote teardown leaves the conversation deletable on retry.

## Known limitations

Both of the following are **accepted and documented decisions, not open
defects**. Each exists because a field file-service's contract does not carry,
and the server is a **read-only** consumer of the `file` table (feature
`085-file-service-migration`) — it cannot write around either one. Please do not
re-report them as bugs; if you intend to close one, start on the file-service
side.

### 1. Inbound re-homed documents have a NULL tagset (currently latent)

**What it is.** An inbound (Element-origin) document is re-homed with a single
atomic PATCH (`moveDocument`) or a COPY, and the resulting row carries **no
tagset** — it keeps the empty `tagsetId` the Synapse media-storage provider gave
the staging row. `Document.tagset` is `Tagset!` (**non-nullable**) in
`schema.graphql`, so any future query selecting `tagset` on a conversation
bucket's documents would fail for those documents.

**Why it exists.** file-service's `UpdateDocumentInput` (`PATCH
/internal/file/:id`) has **no `tagsetId` field**, and the server never writes the
`file` table directly. There is therefore no point at which the server can
physically attach a tagset on re-home.

**Why it is unreachable today.** Nothing selects the field on these rows: the web
client's `ConversationStorageConfig` query selects only `id`,
`allowedMimeTypes`, `maxFileSize` and `authorization` on
`Conversation.storageBucket`, and never `documents`. Server-side,
`DocumentAuthorizationService` already treats a tagset-less row as a valid state
and skips only the tagset leg of the cascade (a tagset present *without* its
authorization is still a genuine defect and still throws).

**To close it**, file-service would need a `tagsetId` on `UpdateDocumentInput`
(and on `CopyDocumentInput`) so the re-home can mint and attach a tagset on the
same atomic call. Making `Document.tagset` nullable instead is a **BREAKING**
schema change and would need CODEOWNER approval.

### 2. The re-share COPY path cannot restore the human filename

**What it is.** The re-share **COPY** branch inherits the source row's
`displayName`. For a re-share of still-staged Element media that name is the
opaque Synapse `media_id`, so the copy loses the Element ↔ web filename parity
the **MOVE** branch does restore (MOVE sends the sanitized event `body` on its
atomic PATCH — see `sanitizeAttachmentDisplayName`).

**Why it exists.** file-service's `CopyDocumentInput` (`POST
/internal/file/copy`) has **no `displayName` field**.

**Why it is not worked around.** A follow-up PATCH to rename the copy would make
the placement non-atomic — a partial failure would leave a copied-but-misnamed
row — which is not worth paying for a cosmetic field. The limitation is TODO'd at
the call site in `MessageAttachmentService.rehomeOne`.

**To close it**, add `displayName` to `CopyDocumentInput` and pass the same
sanitized name the MOVE branch already computes.

## Other notes

- AV/malware scanning is intentionally out of scope (FR-024): chat media inherits
  the platform's existing upload behaviour.
- The `matrix_media` staging bucket carries no policy and none is enforced on it
  — that row is created directly by the Synapse media-storage provider against
  file-service, which the server does not mediate (the provider sends no
  `allowedMimeTypes`/`maxFileSize` on the create, and file-service only enforces
  the ones a request supplies). The conversation/collaboration bucket policy is
  enforced on re-home.
- Media whose parent callout cannot be resolved, or whose room type is neither a
  conversation nor a comment room, is left in staging (logged).
