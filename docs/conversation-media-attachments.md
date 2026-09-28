# Conversation media attachments

Feature `013-matrix-media-file-service` supports web and native Element messages.
The cross-repo implementation plan and release evidence are maintained in
`agents-hq/specs/013-matrix-media-file-service/`. This document describes the local
rewrite. Completed local browser checks and outstanding deployment conditions
are recorded in the workspace verification document.

## Sending and storage

The web composer retains selected files locally until Send. It sends text and
then each attachment as separate Matrix events, sequentially. Each attachment is
uploaded as a durable document before publication. Only confirmed text/files are
cleared; failure stops the loop and retains the remaining draft. A completed
upload is reused on manual retry. Navigation disposes the old composer and stops
its remaining work. An already submitted event cannot be cancelled.

The room mutation and adapter accept either text or one attachment, and return
that actual event. Attachments must belong to the destination bucket, satisfy its
MIME/size policy, and be readable by the sender. Another member may reuse a file;
there is no single-use or uploader-only gate.

Web upload forwarding uses a bounded Readable stream through the existing
multipart endpoint. It makes one HTTP attempt: a consumed stream cannot be
retried. The adapter streams file-service bytes into Synapse as the real sender.
File-service image processing may decode images; the transport itself must not
retain a whole file in RAM.

The Synapse provider stores local original uploads byte-for-byte in an internal
`matrix_media` bucket (`00000000-0000-4000-8000-000000000013`). Its row stays there,
keyed by media ID. Synapse retains its existing media PVC. Provider fetch downloads
to a temporary disk file and serves it with Synapse's FileResponder.

## Incoming placement and reads

Before acknowledging an incoming media event or publishing the ordinary web
update, the server awaits attachment placement. It loads the stable provider row
and the target bucket. For a web event, it reuses the hinted document only if the
bucket, document policy and content hash match. Otherwise it copies the provider
reference into the target bucket. The copied document has its authorization and
tagset prepared before insertion and receives the event's filename. Both rows
share the existing content-addressed blob; neither is moved or coalesced away.

Repeated placement uses the existing scoped-reference uniqueness/reuse behavior.
Operational errors reach the queue's existing failure path. Unsupported media
remains unavailable in Alkemio; the native Matrix event remains intact.

History batches document lookups. Reads perform no placement or durability
writes. An unavailable or denied attachment retains its event filename with
nullable document ID, URL and metadata. A successful descriptor uses the event's
filename and the authorized document's metadata. Event image dimensions are
optional and must fit GraphQL Int.

## Authorization

A conversation owns a storage aggregator and bucket. Bucket policy follows the
existing conversation authorization cascade, which enumerates participants; this
feature does not introduce a new conversation-member credential. Conversation
documents omit the independent creator self-management grant so a completed
membership removal does not re-grant access to the uploader. Other document
creator semantics remain unchanged. The inherited concurrent-upload/membership
snapshot convention is outside this feature's scope. The serving authorization
service also caches policies (60 seconds in the tested v0.0.5 default), so a
completed cascade does not imply immediate HTTP revocation.

The Alkemio document URL enforces the document policy. Native Synapse media
retrieval authenticates the caller but does not check room membership against an
already known media URI. Do not describe those two serving paths as equivalent.

Comment-room attachments use their existing parent collaboration bucket and its
normal authorization and policy.

## Lifecycle and rollout

There are no attachment durability pins, staging sweep, read repairs or Redis
claims. Failed or uncertain sends can leave authorized, retained uploads. Message
redaction hides the event without deleting shared bytes. Synapse's storage
provider interface supplies no deletion callback, so Synapse purge does not
reclaim file-service rows. No new garbage collector is implemented.

There is no feature flag. Apply the server-owned file schema and reserved-bucket
migrations before deploying the file-service binary that requires them. File-service
must support copy `displayName` before the new server is deployed: the preceding
merged endpoint rejects that unknown field with HTTP 400. Deploy
the provider with the existing Synapse PVC retained, then compatible adapter,
server and client versions. Existing conversations need the normal authorization
rebuild after their bucket migration; verify that an existing conversation's
storageBucket resolves before enabling uploads through the deployed client.

The deployment changes and both real-client rendering/download checks are release
gates. Old media without a provider row is a separate backfill concern; reads do
not repair it.
