import type { DocumentReferenceResult } from '@services/adapters/file-service-adapter/dto';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import DataLoader from 'dataloader';

/**
 * How long a scheduled dims batch may wait for the barrier before it dispatches
 * anyway. This is a LIVENESS BACKSTOP, not a batching window: the barrier is
 * released from a `finally` in `resolveMessageAttachments`, so every registered
 * message settles on every path (early return, throw, success). The timer only
 * exists so that a future refactor which loses a `settle()` degrades into an
 * extra request instead of stalling `Message.attachments` — a NON-NULLABLE
 * field, whose stall would fail the whole message read. When it does fire the
 * only cost is that late ids form a second batch.
 */
const DIMS_BATCH_LIVENESS_TIMEOUT_MS = 5000;

/**
 * Per-REQUEST loader for file-service's own MEASUREMENT of an image document
 * (`imageWidth`/`imageHeight`), keyed by document id. `null` means "file-service
 * has no measurement for that id" — a NORMAL partial result, never an error.
 *
 * Adds `beginMessage` to the plain `DataLoader` surface; see the factory below.
 */
export type MessageAttachmentDimsLoader = DataLoader<
  string,
  DocumentReferenceResult | null
> & {
  /**
   * Register ONE message's attachment resolution as a participant in this
   * request's dims batch, and return its IDEMPOTENT `settle` callback.
   *
   * MUST be called SYNCHRONOUSLY at the top of the resolution (before the first
   * `await`) — graphql-js invokes every list item's field resolvers in a single
   * turn, so every message of a room's history registers before any of them
   * reaches its dims phase. `settle` MUST then be called BEFORE that message
   * awaits `load`/`loadMany` (a participant that waits on its own release would
   * deadlock); calling it again afterwards is a no-op, which is what makes a
   * `finally` the right place for the safety call.
   */
  beginMessage(): () => void;
};

/**
 * Build the per-request image-dimensions loader (feature 013).
 *
 * WHY IT EXISTS. `Message.attachments` is a `@ResolveField` and
 * `RoomResolverFields.messages` returns a room's ENTIRE history UNPAGINATED, so
 * anything issued per message fans out once PER MESSAGE PER VIEWER PER PAGE
 * LOAD. Dims resolution must run AFTER each attachment's per-viewer READ gate
 * (an attachment the viewer cannot read must cost no metadata round-trip), so it
 * cannot simply be hoisted to the point where the list materializes. A
 * per-request loader is what reconciles the two: each message asks by document
 * id AFTER its own gate, and the loader coalesces every id asked for across the
 * whole request into ONE `getDocumentMetaBatch` call.
 *
 * WHY A BARRIER, AND NOT THE DEFAULT BATCH WINDOW. DataLoader's default
 * scheduler dispatches at the end of the microtask drain in which the FIRST
 * `load` landed. That is not enough here: the messages do not reach their dims
 * phase together — each one first awaits its own document/by-reference DB
 * queries, whose responses arrive in separate I/O callbacks and therefore
 * separate drains. With the default window a 40-message history would still
 * issue several requests. So dispatch is gated on a participant COUNT instead:
 * every message registers via `beginMessage` in the initial (single) resolver
 * turn and releases as it reaches its dims phase; the batch dispatches once the
 * last participant has released. Because GraphQL cannot answer the `messages`
 * field until every message has resolved anyway, waiting for the slowest one
 * adds NO end-to-end latency — it only moves where the waiting happens.
 *
 * REQUEST SCOPING. The instance is created by `MessageAttachmentDimsLoaderCreator`
 * once per request, via `DataLoaderInterceptor`, which memoizes it on the
 * per-request GraphQL context. Both the DataLoader cache and the barrier state
 * below are therefore closed over per request, so one viewer's measurements — and
 * one request's participant count — can never leak into another's.
 *
 * `cache` comes from `DataLoaderInterceptor` via the creator and MUST be
 * honoured: the interceptor sets it to FALSE on websocket/subscription
 * contexts, where the GraphQL context (and therefore this loader) is scoped to
 * the CONNECTION rather than to one read. With caching left on there, a
 * measurement would be memoized for the life of the socket. Batching is
 * unaffected either way — only memoization is.
 */
export const createMessageAttachmentDimsLoader = (
  fileServiceAdapter: FileServiceAdapter,
  options?: { cache?: boolean }
): MessageAttachmentDimsLoader => {
  /** Messages that have registered but not yet reached their dims phase. */
  let activeMessages = 0;
  /** Release hook for the batch currently scheduled, if any. */
  let releasePendingBatch: (() => void) | undefined;

  const scheduleDispatch = (dispatch: () => void): void => {
    let dispatched = false;
    let liveness: ReturnType<typeof setTimeout> | undefined;

    const fire = (): void => {
      if (dispatched) {
        return;
      }
      dispatched = true;
      releasePendingBatch = undefined;
      if (liveness) {
        clearTimeout(liveness);
      }
      dispatch();
    };
    const fireWhenIdle = (): void => {
      if (activeMessages === 0) {
        fire();
      }
    };

    // Always defer by one macrotask turn: a message calls `settle()` and only
    // THEN enqueues its ids, so firing synchronously on release would dispatch a
    // batch that is missing the very keys that released it.
    releasePendingBatch = (): void => {
      setImmediate(fireWhenIdle);
    };
    // Covers the no-participant case (a caller that loads without registering,
    // e.g. a single message resolved outside a room read) and the case where
    // every participant had already released before the first `load`.
    setImmediate(fireWhenIdle);

    liveness = setTimeout(fire, DIMS_BATCH_LIVENESS_TIMEOUT_MS);
    liveness.unref?.();
  };

  const loader = new DataLoader<string, DocumentReferenceResult | null>(
    async documentIds => {
      // Deliberately NO `maxBatchSize`: file-service's 100-id cap is the
      // ADAPTER's concern, and `getDocumentMetaBatch` already chunks to it. A
      // loader-side cap would split the request into several DataLoader batches
      // instead of one call that the adapter fans out internally.
      const metaById = await fileServiceAdapter.getDocumentMetaBatch([
        ...documentIds,
      ]);
      // Keyed by ID, never by response position — `/meta-batch` answers a
      // partial, UNORDERED `files` array (see getDocumentMetaBatch).
      return documentIds.map(documentId => metaById.get(documentId) ?? null);
    },
    {
      cache: options?.cache ?? true,
      name: 'MessageAttachmentDimsLoader',
      batchScheduleFn: scheduleDispatch,
    }
  );

  const beginMessage = (): (() => void) => {
    activeMessages += 1;
    let settled = false;
    return (): void => {
      if (settled) {
        return;
      }
      settled = true;
      activeMessages -= 1;
      if (activeMessages === 0) {
        releasePendingBatch?.();
      }
    };
  };

  return Object.assign(loader, { beginMessage });
};
