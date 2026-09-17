# Contract: Collabora document lifecycle analytics events

**Scope**: Internal, in-process domain events only. No GraphQL, RabbitMQ, or persisted schema changes.

## Event types

| Event | Published by | Subscriber reporter |
|---|---|---|
| `CollaboraDocumentOpened` | `collaboraEditorUrl` after the editor URL resolves | `collaboraDocumentOpened` |
| `CollaboraDocumentReplaced` | replace-document mutation after swap and optional rename processing | `calloutCollaboraDocumentReplaced` |
| `CollaboraDocumentUploaded` | `importCollaboraDocument` after persistence and authorization policy application | `calloutCollaboraDocumentUploaded` |

Each event is a distinct typed class and uses a centralized event-name constant. A singleton `CollaboraDocumentEventsService` is the domain publisher. It calls synchronous `EventEmitter2.emit`; callers never access EventEmitter2 directly and the publisher never calls or awaits `emitAsync`.

## Payload

All three event classes carry the same immutable values:

```ts
type CollaboraDocumentActorAttribution = Readonly<{
  actorID: string;
  isAnonymous: boolean;
  guestName: string | undefined;
}>;

{
  readonly id: string;
  readonly name: string;
  readonly actorAttribution: CollaboraDocumentActorAttribution;
}
```

- `id` is the `CollaboraDocument.id`, never its backing storage-document id.
- `name` is resolved by the authorized operation before it invokes the publisher, using the existing fallback: `profile.displayName ?? id`. The publisher emits that immutable value without performing a lookup.
- `actorAttribution` is a fresh exact three-field projection of the live request context. `CollaboraDocumentEventsService` owns this projection so callers cannot diverge. It shallow-freezes the attribution object and event envelope before emitting; all retained fields are primitives.
- The complete `ActorContext`, credentials, authentication/session timestamps, delegation metadata, and all other request fields are absent. No reference to the input context is retained.
- `space` is deliberately absent. Resolving it is the subscriber's side effect, not publisher work.

## Delivery

- Delivery is in-process, asynchronous from the publisher's perspective, best-effort, and non-durable.
- A process exit after `emit` may lose the analytics event; this matches the existing best-effort reporter semantics.
- There is no retry, outbox, replay, or concurrency limiter in this feature.
- Site 4 does not publish these events. It consumes external Collabora window events and writes a different aggregate analytics shape.
- The temporary Release 71 suppression is not part of this contract. The proper implementation restores all three lifecycle records and the separate site-4 aggregate records while removing the hotfix's commented blocks, early return, and skipped assertions.

## Subscriber guarantees

One singleton subscriber registered by `CollaboraDocumentModule` listens for all three event types. For every received event it:

1. resolves `space` with `getLevelZeroSpaceIdForCollaboraDocument(event.id)`;
2. measures only that lookup with monotonic `performance.now()`;
3. emits exactly one INFO-level structured timing record on success or failure with stable `message`, `eventName`, `collaboraDocumentId`, `outcome`, and `durationMs` under `LogContext.COLLABORATION`;
4. selects the reporter method corresponding to the typed event;
5. passes `{ id: event.id, name: event.name, space }` and `event.actorAttribution` unchanged;
6. catches and logs lookup or synchronous dispatch failures with `LogContext.COLLABORATION`;
7. never rethrows to the event publisher and never produces an unhandled rejection.

The subscriber does not mutate entities, authorize requests, or change reporter-generated fields.

## Domain publisher guarantees

- Authorization and the primary user operation complete before publication; replacement and upload publish only after their required persistence succeeds so subscribers read committed ownership state.
- Exactly one event is emitted for each successful operation.
- No event is emitted when authorization or the primary operation fails.
- A pending or failing subscriber cannot change the publisher's result.
- The publisher accepts the live `ActorContext` from each authorized caller but retains only the copied, frozen three-field attribution value.
- Publisher tests with a real pending listener prove immediate `void` return; spies assert `emit` is called and `emitAsync` is never called. A timeout alone is insufficient because `void emitAsync(...)` would also return immediately.
- `CollaboraDocumentEventsService` is exported by `CollaboraDocumentModule` so both Collabora resolvers and the importing Callout module use the same domain-owned publication boundary.
