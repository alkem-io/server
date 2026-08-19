import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

/**
 * The go-yjs wire envelope every frame carries: `[type as VarUint][payload]`
 * (collaboration-service `internal/domain/model/control.go`). Types 0/1 are
 * standard y-protocols; 2 (ephemeral presence) is volatile and ignored here; 3
 * (control) carries a JSON {@link ControlMessage} payload.
 */
const WIRE_SYNC = 0;
const WIRE_AWARENESS = 1;
const WIRE_EPHEMERAL = 2;
const WIRE_CONTROL = 3;

/**
 * Server→client control payload (collaboration-service `ControlMessage`). Only
 * the fields the assistant collaborator consumes are modelled; `readOnly` is
 * intentionally optional (Go `*bool, omitempty`): its ABSENCE means "this frame
 * says nothing about read-only", an explicit `false` means edit access was
 * regained. Test key presence, never truthiness.
 */
interface ControlMessage {
  kind: 'saved' | 'save-error' | 'read-only-state' | string;
  version?: number;
  error?: string;
  readOnly?: boolean;
  reason?: string;
}

/** Raised when the room refuses the join because the whiteboard is being deleted. */
export class DocumentPurgingError extends Error {
  constructor(documentId: string) {
    super(`Whiteboard ${documentId} is deleted (room join refused)`);
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
      `Whiteboard ${documentId} joined read-only${reason ? ` (${reason})` : ''}`
    );
    this.name = 'ReadOnlyRoomError';
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
export class WhiteboardCollaborationSession {
  readonly doc = new Y.Doc();
  private ws?: WebSocket;
  private synced = false;
  private syncedResolve?: () => void;
  private syncedReject?: (err: Error) => void;
  private readonly syncedPromise: Promise<void>;

  /** Set once a read-only-state frame with `readOnly: true` arrives. */
  private readOnly = false;
  private readOnlyReason?: string;
  /** Terminal close cause distinguished by the 1008 close reason string. */
  private closeError?: Error;
  /** Resolvers waiting for the next `ControlSaved` after a write. */
  private savedWaiters: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
  }> = [];

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

    ws.on('open', () => {
      // SyncStep1: advertise our (empty) state vector so the room replies with its
      // full state as SyncStep2.
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, WIRE_SYNC);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      this.send(encoding.toUint8Array(encoder));
    });

    ws.on('message', (data: ArrayBuffer | Buffer) => this.onMessage(data));

    ws.on('close', (code: number, reasonBuf: Buffer) => {
      const reason = reasonBuf?.toString() ?? '';
      // A refused join rides the close reason, not a control frame (handler.go).
      if (code === WS_CLOSE_POLICY_VIOLATION && reason === 'document deleted') {
        this.closeError = new DocumentPurgingError(this.documentId);
      } else if (!this.synced) {
        this.closeError = new Error(
          `Whiteboard room closed before sync (code ${code}${reason ? `, ${reason}` : ''})`
        );
      }
      this.failPending(
        this.closeError ??
          new Error(`Whiteboard room connection closed (code ${code})`)
      );
    });

    ws.on('error', (err: Error) => {
      this.closeError = this.closeError ?? err;
      this.failPending(err);
    });

    await this.withTimeout(this.syncedPromise, timeoutMs, 'sync');
  }

  /** True once a read-only-state frame marked this actor a viewer. */
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
   * Resolve once the next `ControlSaved` arrives (durable: a checkpoint is always a
   * COMPLETE snapshot and applies are single-writer-ordered, so any saved after our
   * update covers it). Rejects on `save-error` (not-yet-durable) or a terminal close.
   */
  waitForNextSaved(timeoutMs: number): Promise<void> {
    if (this.closeError) {
      return Promise.reject(this.closeError);
    }
    const waiter = new Promise<void>((resolve, reject) => {
      this.savedWaiters.push({ resolve, reject });
    });
    return this.withTimeout(waiter, timeoutMs, 'durable save');
  }

  close(): void {
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
      case 'saved':
        this.resolveSaved();
        break;
      case 'save-error':
        this.rejectSaved(
          new Error(`Whiteboard save failed: ${msg.error ?? 'unknown error'}`)
        );
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

  private resolveSaved(): void {
    const waiters = this.savedWaiters;
    this.savedWaiters = [];
    for (const w of waiters) {
      w.resolve();
    }
  }

  private rejectSaved(err: Error): void {
    const waiters = this.savedWaiters;
    this.savedWaiters = [];
    for (const w of waiters) {
      w.reject(err);
    }
  }

  private failPending(err: Error): void {
    if (!this.synced) {
      this.syncedReject?.(err);
    }
    this.rejectSaved(err);
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
              `Whiteboard ${label} timed out after ${timeoutMs}ms for ${this.documentId}`
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
