import { randomUUID } from 'node:crypto';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

/**
 * The go-yjs wire envelope every frame carries: `[type as VarUint][payload]`
 * (collaboration-service `internal/domain/model/control.go`). Types 0/1 are
 * standard y-protocols; 2 (ephemeral presence) is volatile and ignored here; 3
 * (control) carries a JSON {@link ControlMessage} payload; 4 (durability-request)
 * is the CLIENT→SERVER persist-barrier request — raw JSON `{"requestId"}`.
 */
const WIRE_SYNC = 0;
const WIRE_AWARENESS = 1;
const WIRE_EPHEMERAL = 2;
const WIRE_CONTROL = 3;
const WIRE_DURABILITY_REQUEST = 4;

/**
 * Server→client control payload (collaboration-service `ControlMessage`). Only
 * the fields the assistant collaborator consumes are modelled; `readOnly` is
 * intentionally optional (Go `*bool, omitempty`): its ABSENCE means "this frame
 * says nothing about read-only", an explicit `false` means edit access was
 * regained. Test key presence, never truthiness.
 */
interface ControlMessage {
  kind:
    | 'admission'
    | 'saved'
    | 'save-error'
    | 'read-only-state'
    | 'persisted'
    | 'persist-failed'
    | 'session-end'
    | string;
  version?: number;
  error?: string;
  readOnly?: boolean;
  reason?: string;
  mode?: 'read' | 'write';
  code?: string;
  scope?: 'member' | 'document';
  disposition?: 'transient' | 'manual' | 'terminal';
  /**
   * Correlates a `persisted` / `persist-failed` reply to the durability request
   * that asked. ABSENT on every other kind.
   */
  requestId?: string;
}

/** Raised when the room refuses the join because the document is being deleted. */
export class DocumentPurgingError extends Error {
  constructor(documentId: string) {
    super(`Document ${documentId} is deleted (room join refused)`);
    this.name = 'DocumentPurgingError';
  }
}

/** Raised when the actor resolves to viewer — no UPDATE_CONTENT — so writes must fail fast. */
export class ReadOnlyRoomError extends Error {
  constructor(
    documentId: string,
    public readonly reason?: string
  ) {
    super(
      `Document ${documentId} joined read-only${reason ? ` (${reason})` : ''}`
    );
    this.name = 'ReadOnlyRoomError';
  }
}

/**
 * Raised when the server rejects local content on this session (a typed
 * `content-refused` session end): the connection holds a struct the server refused, so nothing
 * it wrote is durable and no barrier may ever answer `persisted`. TERMINAL for the
 * ephemeral MCP caller — resending identical rejected bytes is futile; a genuine fresh
 * generation (new session / resync) is the only recovery.
 */
export class UpdateRejectedError extends Error {
  constructor(
    documentId: string,
    public readonly reason?: string
  ) {
    super(
      `Document ${documentId} update rejected by the server${reason ? ` (${reason})` : ''}`
    );
    this.name = 'UpdateRejectedError';
  }
}

export type CollaborationSessionEndDisposition =
  | 'transient'
  | 'manual'
  | 'terminal';

/** A typed room ending whose disposition controls the caller's retry decision. */
export class CollaborationSessionEndError extends Error {
  constructor(
    documentId: string,
    public readonly disposition: CollaborationSessionEndDisposition,
    code?: string
  ) {
    super(
      `Collaboration session ended for ${documentId}` +
        `${code ? ` (${code})` : ''}` +
        ` [${disposition}]`
    );
    this.name = 'CollaborationSessionEndError';
  }
}

/** Close code the room uses for a refused join (StatusPolicyViolation). */
const WS_CLOSE_POLICY_VIOLATION = 1008;

/**
 * One live y-protocols session against a whiteboard room on collaboration-service
 * (`/collab/{documentId}?type=whiteboard`). Owns a single {@link Y.Doc} on the
 * server's own `yjs` instance, drives the sync handshake, tracks read-only + the
 * durable-save signal, and forwards local mutations as a single update frame.
 *
 * The session is EPHEMERAL: an MCP tool opens it, reads or applies one logical
 * mutation, waits for durability, and closes. It never produces awareness/presence.
 */
export class CollaborationDocumentSession {
  readonly doc = new Y.Doc();
  private ws?: WebSocket;
  private synced = false;
  private syncedResolve?: () => void;
  private syncedReject?: (err: Error) => void;
  private readonly syncedPromise: Promise<void>;

  /** Set by admission before sync; the legacy read-only frame is compatibility only. */
  private readOnly = false;
  private readOnlyReason?: string;
  /** Terminal close cause distinguished by the 1008 close reason string. */
  private closeError?: Error;
  /**
   * The single OUTSTANDING durability barrier (at most one per connection). It owns
   * its own timer and is settled EXACTLY ONCE via {@link settleBarrier} — on the
   * matching `persisted` (resolve) / `persist-failed` (reject), a content-refused end
   * or terminal close/ws error (reject), timeout, or session close — clearing both
   * the waiter and the timer so a later frame can never act on stale state.
   */
  private barrier?: {
    requestId: string;
    resolve: () => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  /**
   * STICKY once the server rejects local content on this connection (`content-refused`):
   * that generation holds a struct the server refused, so no barrier may ever answer
   * `persisted`. Mirrors the server's per-member `durabilityPoisoned`; cleared only by a
   * fresh session.
   */
  private durabilityPoisoned = false;

  constructor(
    private readonly url: string,
    private readonly headers: Record<string, string>,
    private readonly documentId: string
  ) {
    this.syncedPromise = new Promise((resolve, reject) => {
      this.syncedResolve = resolve;
      this.syncedReject = reject;
    });
  }

  /** Open the socket, run the sync handshake, and resolve once the room state is in `doc`. */
  async connect(timeoutMs: number): Promise<void> {
    const ws = new WebSocket(this.url, { headers: this.headers });
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    // Admission is the first server frame. Sync starts only after the session's
    // immutable read/write capability is known, so a read-admitted consumer can
    // never publish local state before learning it is a viewer.

    ws.on('message', (data: ArrayBuffer | Buffer) => this.onMessage(data));

    ws.on('close', (code: number, reasonBuf: Buffer) => {
      const reason = reasonBuf?.toString() ?? '';
      // A refused join rides the close reason, not a control frame (handler.go).
      if (code === WS_CLOSE_POLICY_VIOLATION && reason === 'document deleted') {
        this.closeError = new DocumentPurgingError(this.documentId);
      } else if (!this.synced) {
        this.closeError = new Error(
          `Collaboration room closed before sync (code ${code}${reason ? `, ${reason}` : ''})`
        );
      }
      this.failPending(
        this.closeError ??
          new Error(`Collaboration room connection closed (code ${code})`)
      );
    });

    ws.on('error', (err: Error) => {
      this.closeError = this.closeError ?? err;
      this.failPending(err);
    });

    await this.withTimeout(this.syncedPromise, timeoutMs, 'sync');
  }

  /** True when admission (or the temporary legacy frame) marks this actor read-only. */
  isReadOnly(): boolean {
    return this.readOnly;
  }

  readOnlyError(): ReadOnlyRoomError {
    return new ReadOnlyRoomError(this.documentId, this.readOnlyReason);
  }

  /**
   * Run `mutator` inside a single Yjs transaction under {@link MCP_ORIGIN}, capture
   * the ONE resulting update, and send it as a single update frame (one rate-limit
   * token regardless of how many elements changed). Returns the exact bytes sent so
   * the caller can resend them verbatim on a retry (Yjs makes that idempotent).
   * Returns `null` when the mutation produced no change.
   */
  sendMutation(mutator: (doc: Y.Doc) => void): Uint8Array | null {
    // The fork emits a create as TWO transactions (structural prelude + local
    // reveal, FR-017), so do NOT wrap in our own transaction — that would collapse
    // the fork's boundaries. Instead collect every update the mutator produces:
    // during a SYNCHRONOUS mutator no remote frame is processed (single-threaded),
    // so any update whose origin is not the remote sync origin (`this`) is ours.
    // Merge them into ONE wire frame (one rate-limit token) that reproduces the
    // same final state on the server.
    const updates: Uint8Array[] = [];
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== this) {
        updates.push(update);
      }
    };
    this.doc.on('update', onUpdate);
    try {
      mutator(this.doc);
    } finally {
      this.doc.off('update', onUpdate);
    }
    if (updates.length === 0) {
      return null;
    }
    const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates);
    this.resend(merged);
    return merged;
  }

  /** Resend a previously-captured update frame verbatim (retry path). */
  resend(update: Uint8Array): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WIRE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.send(encoding.toUint8Array(encoder));
  }

  /**
   * Request a CORRELATED durability barrier for the update(s) already sent on this
   * connection, resolving only when the server confirms THEM durable.
   *
   * The service answers a `persist-request(requestId)` — enqueued on the same
   * per-connection FIFO, after the update — with `persisted(requestId)` once that state
   * has reached the durable store, or `persist-failed(requestId)` if it cannot. A
   * room-wide `saved` broadcast answers NOBODY and never stands in for this: correlation
   * is by the `requestId` this call mints. At most ONE barrier may be outstanding per
   * connection; a second concurrent call rejects WITHOUT sending anything. The waiter is
   * installed BEFORE the request frame is sent, so an immediate reply cannot race ahead
   * of it. Rejects on `persist-failed`, a content-refused end (which sticky-poisons this
   * session), a terminal close/ws error, or timeout — every path clears the waiter+timer.
   */
  requestDurability(timeoutMs: number): Promise<void> {
    if (this.closeError) {
      return Promise.reject(this.closeError);
    }
    if (this.durabilityPoisoned) {
      return Promise.reject(new UpdateRejectedError(this.documentId));
    }
    if (this.barrier) {
      return Promise.reject(
        new Error(
          `A durability request is already outstanding for ${this.documentId}`
        )
      );
    }
    const requestId = randomUUID();
    const promise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.settleBarrier(
          requestId,
          new Error(
            `Document durable persist timed out after ${timeoutMs}ms for ${this.documentId}`
          )
        );
      }, timeoutMs);
      // Install the waiter (synchronously, in this executor) BEFORE the send below.
      this.barrier = { requestId, resolve, reject, timer };
    });
    try {
      this.sendDurabilityRequest(requestId);
    } catch (err) {
      // A synchronous send failure (the socket already crossed to CLOSING/CLOSED)
      // settles THIS barrier — clearing its timer — so the rejection is observed
      // through the returned promise's normal async path, never left as an orphan the
      // caller's later close() would reject into an unhandled rejection.
      this.settleBarrier(
        requestId,
        err instanceof Error ? err : new Error(String(err))
      );
    }
    return promise;
  }

  /** Frame + send a `persist-request` (`[type 4][raw JSON {"requestId"}]`). */
  private sendDurabilityRequest(requestId: string): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WIRE_DURABILITY_REQUEST);
    // RAW JSON remainder (no VarString length) — mirrors the service's
    // `protocol.WriteMessage(type, body)` framing that `durabilityRequestID` reads.
    encoding.writeUint8Array(
      encoder,
      new TextEncoder().encode(JSON.stringify({ requestId }))
    );
    this.send(encoding.toUint8Array(encoder));
  }

  close(): void {
    // Mark the session terminally closed FIRST, so any post-close requestDurability
    // rejects WITHOUT sending, then settle any still-outstanding barrier synchronously
    // (clearing its timer) so a late frame on a dying socket can never act on it.
    this.closeError ??= new Error(
      `Collaboration session closed for ${this.documentId}`
    );
    this.settleBarrier(undefined, this.closeError);
    try {
      this.ws?.close(1000);
    } catch {
      // best-effort teardown
    }
    this.doc.destroy();
  }

  private onMessage(data: ArrayBuffer | Buffer): void {
    const bytes =
      data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
    const decoder = decoding.createDecoder(bytes);
    const type = decoding.readVarUint(decoder);
    switch (type) {
      case WIRE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, WIRE_SYNC);
        const syncType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          this.doc,
          this
        );
        // A reply longer than the type byte must be sent (SyncStep1 → SyncStep2).
        if (encoding.length(encoder) > 1) {
          this.send(encoding.toUint8Array(encoder));
        }
        // Receiving the room's SyncStep2 means its full state is now in our doc.
        if (!this.synced && syncType === syncProtocol.messageYjsSyncStep2) {
          this.synced = true;
          this.syncedResolve?.();
        }
        break;
      }
      case WIRE_AWARENESS:
      case WIRE_EPHEMERAL:
        // The assistant joins without awareness and ignores volatile presence.
        break;
      case WIRE_CONTROL:
        this.onControl(decoder);
        break;
      default:
        break;
    }
  }

  private onControl(decoder: decoding.Decoder): void {
    let msg: ControlMessage;
    try {
      // The control payload is the RAW remainder after the type varint
      // (collaboration-service encodeControl: json.Marshal then WriteMessage type 3).
      const tail = decoding.readTailAsUint8Array(decoder);
      msg = JSON.parse(new TextDecoder().decode(tail)) as ControlMessage;
    } catch {
      return;
    }
    switch (msg.kind) {
      case 'persisted':
        // The correlated durable confirmation for OUR request — resolves the sole
        // barrier IFF its requestId matches (a wrong/other requestId is ignored).
        this.settleBarrier(msg.requestId);
        break;
      case 'persist-failed':
        // The correlated failure for OUR request — rejects the matching barrier.
        this.settleBarrier(
          msg.requestId,
          new Error(
            `Document durable persist failed: ${msg.error ?? 'unknown error'}`
          )
        );
        break;
      case 'admission':
        // The service guarantees this is the first frame. Its mode is the
        // authoritative capability for this one-shot session; the legacy
        // read-only-state below remains a rolling-deployment compatibility input.
        if (msg.mode !== 'read' && msg.mode !== 'write') {
          const err = new Error(
            `Invalid collaboration admission for ${this.documentId}`
          );
          this.closeError = err;
          this.failPending(err);
          this.ws?.close();
          break;
        }
        this.readOnly = msg.mode === 'read';
        this.readOnlyReason = this.readOnly ? msg.reason : undefined;
        this.sendSyncStep1();
        break;
      case 'session-end': {
        const err = this.sessionEndError(msg);
        if (msg.code === 'content-refused') {
          // Sticky exactly like the service's per-member poison: no later
          // persisted frame may convert refused content into success.
          this.durabilityPoisoned = true;
        }
        this.closeError = err;
        this.failPending(err);
        break;
      }
      case 'saved':
      case 'save-error':
        // Room-wide broadcasts — NOT correlated to any per-request barrier. The durable
        // signal for our write is `persisted(requestId)`, never a room-wide `saved`.
        break;
      case 'read-only-state':
        // Key PRESENCE, not truthiness: an absent key says nothing; explicit true
        // downgrades to viewer, explicit false regains edit access.
        if (msg.readOnly === true) {
          this.readOnly = true;
          this.readOnlyReason = msg.reason;
        } else if (msg.readOnly === false) {
          this.readOnly = false;
          this.readOnlyReason = undefined;
        }
        break;
      default:
        break;
    }
  }

  /**
   * Settle the single outstanding barrier EXACTLY ONCE, clearing both the waiter and
   * its timer. When `requestId` is provided (a `persisted`/`persist-failed` reply) the
   * barrier is settled ONLY if it matches — a mismatched/stale reply is ignored. When
   * `requestId` is undefined (close / ws error / typed content refusal, and the barrier's own
   * timeout which passes its own id) it settles whatever barrier is outstanding. A
   * non-null `err` rejects; its absence resolves.
   */
  private settleBarrier(requestId: string | undefined, err?: Error): void {
    const b = this.barrier;
    if (!b) {
      return;
    }
    if (requestId !== undefined && requestId !== b.requestId) {
      return;
    }
    this.barrier = undefined;
    clearTimeout(b.timer);
    if (err) {
      b.reject(err);
    } else {
      b.resolve();
    }
  }

  private failPending(err: Error): void {
    if (!this.synced) {
      this.syncedReject?.(err);
    }
    // A terminal close / ws error fails whatever barrier is outstanding (uncorrelated).
    this.settleBarrier(undefined, err);
  }

  private sendSyncStep1(): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WIRE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    this.send(encoding.toUint8Array(encoder));
  }

  private sessionEndError(msg: ControlMessage): Error {
    if (msg.code === 'document-deleted') {
      return new DocumentPurgingError(this.documentId);
    }
    if (msg.code === 'content-refused') {
      return new UpdateRejectedError(this.documentId, msg.reason ?? msg.error);
    }
    return new CollaborationSessionEndError(
      this.documentId,
      isSessionEndDisposition(msg.disposition) ? msg.disposition : 'terminal',
      msg.code
    );
  }

  private send(bytes: Uint8Array): void {
    this.ws?.send(bytes);
  }

  private withTimeout<T>(
    p: Promise<T>,
    timeoutMs: number,
    label: string
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `Document ${label} timed out after ${timeoutMs}ms for ${this.documentId}`
            )
          ),
        timeoutMs
      );
    });
    return Promise.race([p, timeout]).finally(() =>
      clearTimeout(timer)
    ) as Promise<T>;
  }
}

function isSessionEndDisposition(
  value: string | undefined
): value is CollaborationSessionEndDisposition {
  return value === 'transient' || value === 'manual' || value === 'terminal';
}
