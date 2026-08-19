import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Y from 'yjs';
import {
  DocumentPurgingError,
  ReadOnlyRoomError,
  WhiteboardCollaborationSession,
} from './whiteboard-collaboration.session';

/**
 * The assistant's native Yjs whiteboard client path. MCP tools use this to READ
 * or MUTATE a whiteboard by joining its live collaboration room as an ephemeral,
 * server-side y-protocols collaborator — the SAME room, ordering, per-property
 * CRDT merge, and durable persistence every human editor uses. The server is a
 * real collaborator; it never writes file storage directly and never
 * decode→edit→re-encodes a scene.
 *
 * Element semantics (constructing / mutating elements on the doc) live in the
 * excalidraw-yjs fork and are supplied by the caller as a mutator over the live
 * `Y.Doc`; this service owns only the transport, durability, and retry.
 */
@Injectable()
export class WhiteboardCollaborationService {
  private readonly wsEndpoint: string;
  private readonly actorHeader: string;
  private readonly connectTimeoutMs: number;
  private readonly saveTimeoutMs: number;
  private readonly maxResendRetries = 2;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    const cfg = this.configService.get('collaboration', { infer: true }) as
      | {
          whiteboard?: {
            ws_endpoint?: string;
            actor_id_header?: string;
            connect_timeout_ms?: number;
            save_timeout_ms?: number;
          };
        }
      | undefined;
    this.wsEndpoint = (
      cfg?.whiteboard?.ws_endpoint ?? 'ws://collaboration-service:4004'
    ).replace(/\/$/, '');
    this.actorHeader = cfg?.whiteboard?.actor_id_header ?? 'X-Alkemio-Actor-Id';
    this.connectTimeoutMs = cfg?.whiteboard?.connect_timeout_ms ?? 15_000;
    this.saveTimeoutMs = cfg?.whiteboard?.save_timeout_ms ?? 20_000;
  }

  /**
   * Join the room, run `reader` against the synced live `Y.Doc`, and leave.
   * The reader must be synchronous (the doc is only valid for the call).
   */
  async read<T>(
    documentId: string,
    actorId: string,
    reader: (doc: Y.Doc) => T
  ): Promise<T> {
    const session = this.newSession(documentId, actorId);
    try {
      await session.connect(this.connectTimeoutMs);
      return reader(session.doc);
    } finally {
      session.close();
    }
  }

  /**
   * Join the room, apply `mutator` as ONE logical Yjs transaction (a single update
   * frame → one rate-limit token), and return only once the change is DURABLE (a
   * `ControlSaved` covering it, guaranteed by single-writer ordering + complete
   * snapshots). A read-only join fails immediately. On an ambiguous disconnect
   * before durability, reconnects and resends the SAME update bytes (Yjs-idempotent);
   * a deleted board (`DocumentPurgingError`) is terminal.
   */
  async mutate(
    documentId: string,
    actorId: string,
    mutator: (doc: Y.Doc) => void
  ): Promise<void> {
    let update: Uint8Array | null = null;
    for (let attempt = 0; attempt <= this.maxResendRetries; attempt++) {
      const session = this.newSession(documentId, actorId);
      try {
        await session.connect(this.connectTimeoutMs);
        if (session.isReadOnly()) {
          throw session.readOnlyError();
        }
        if (attempt === 0) {
          update = session.sendMutation(mutator);
          if (!update) {
            return; // no-op: nothing to persist
          }
        } else {
          // Idempotent recovery: the FIRST attempt's bytes, never a re-derivation
          // from tool input (a fresh clock/ids would double the edit).
          session.resend(update as Uint8Array);
        }
        await session.waitForNextSaved(this.saveTimeoutMs);
        return; // durable
      } catch (err) {
        if (
          err instanceof DocumentPurgingError ||
          err instanceof ReadOnlyRoomError ||
          update === null ||
          attempt === this.maxResendRetries
        ) {
          throw err;
        }
        this.logger.warn?.(
          `whiteboard mutate: retrying durable resend (attempt ${attempt + 1}) for ${documentId}: ${err instanceof Error ? err.message : 'unknown error'}`,
          LogContext.MCP_SERVER
        );
      } finally {
        session.close();
      }
    }
  }

  private newSession(
    documentId: string,
    actorId: string
  ): WhiteboardCollaborationSession {
    const url = `${this.wsEndpoint}/collab/${encodeURIComponent(documentId)}?type=whiteboard`;
    const headers = { [this.actorHeader]: actorId };
    return new WhiteboardCollaborationSession(url, headers, documentId);
  }
}
