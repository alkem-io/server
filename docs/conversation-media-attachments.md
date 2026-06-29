# Conversation Media Attachments

> Feature `013-matrix-media-file-service`. Cross-repo spec:
> `../agents-hq/specs/013-matrix-media-file-service/`.

Lets users attach images/files/audio/video to conversation messages from both the
web client and native Element, with every media file stored **once** through
file-service and governed by chat membership.

## Feature flag

All user-facing behaviour is gated by `communications.message_attachments.enabled`
(env `COMMUNICATIONS_MESSAGE_ATTACHMENTS_ENABLED`, **default `false`**). When off:
the GraphQL surface stays present (additive, backward-compatible) but
`Message.attachments` resolves to `[]`, outbound attachment ids are rejected, and
no inbound re-home happens.

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
  `ConversationAuthorizationService`. READ on attachments is therefore granted to
  exactly the conversation members and follows membership changes live. The
  generic StorageAggregator auth is deliberately **not** used (it would grant
  registered/anonymous READ).
- **`matrix_media` staging bucket** — a reserved platform-level bucket
  (fixed id `00000000-0000-4000-8000-000000000013`, config
  `storage.file_service.matrix_media_bucket_id`). The Synapse storage provider
  creates inbound Matrix media here first; the server re-homes rows out of it.

## Outbound (web compose)

`RoomSendMessageInput.attachments: [UUID!]` (≤10) carries file-service document
ids previously uploaded into the conversation bucket (`temporaryLocation: true`
until send). On send, `MessageAttachmentService.resolveOutboundAttachments`
validates count/READ/type/size, flips `temporaryLocation` off, and threads
`AttachmentRef`s to matrix-adapter via `SendMessageRequest.attachments`. The
adapter embeds `io.alkemio.document_id` on the outbound `m.image`/`m.file` event.

## Inbound (Element-origin) — eager re-home

On `communication.message.received`, `MessageAttachmentService.rehomeInboundAttachments`
re-homes each Element-origin attachment (`media_id`) **eagerly** so reads are
plain lookups:

- staging document (`matrix_media`) → **MOVE** into the conversation bucket,
  minting a DOCUMENT auth that inherits the bucket auth, setting
  `createdBy = sender`, keeping `externalReference = media_id`;
- HEIC/unrenderable staging → re-create **transcoded** (read staging bytes →
  create without `skipImageProcessing`) for web renderability (research D6);
- already homed elsewhere (re-share) → **COPY** (zero-copy, shared blob).

Idempotent: a second receive finds the document already in the target bucket.

## Read resolution

`Message.attachments` (`@ResolveField`) resolves, READ-gated, to
`MessageAttachment { id, url, displayName, mimeType, size, width, height }`:
outbound via the event's `io.alkemio.document_id`; inbound via
`by-reference(conversationBucket, media_id)`. Non-members are denied.

## Lifecycle

- **Delete-release** — on message delete the backing documents are released via
  `FileServiceAdapter.deleteDocument`; the blob is GC'd only when no row
  references its `externalID`, so a re-shared blob survives elsewhere.
- **Staging cleanup** — `MessageAttachmentCleanupService` (daily cron) releases
  `matrix_media` staging documents older than 24h and unsent `temporaryLocation`
  conversation uploads older than 24h.

## Notes / current limitations

- **Comment rooms** (callout/post): the inbound re-home currently resolves only
  the conversation bucket; comment-room media is left in staging (logged) pending
  the parent-bucket resolution wiring — see the spec.
- AV/malware scanning is intentionally out of scope (FR-024): chat media inherits
  the platform's existing upload behaviour.
