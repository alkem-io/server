import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as Y from 'yjs';
import {
  CollaborationDocumentSession,
  CollaborationSessionEndError,
  DocumentPurgingError,
  ReadOnlyRoomError,
  UpdateRejectedError,
} from './collaboration-document.session';

/** The unified `/collab/{id}?type=…` document kinds this client can join. */
export type CollaborationDocumentType = 'whiteboard' | 'memo';

/**
 * The server-side native-Yjs collaboration client. Any server actor (MCP tools, and
 * the domain content-replace paths) uses this to READ or MUTATE a whiteboard or memo
 * by joining its live collaboration room as an ephemeral, server-side y-protocols
 * collaborator — the SAME room, ordering, per-property CRDT merge, and durable
 * persistence every human editor uses. The server is a real collaborator; it never
 * writes the document snapshot to file storage directly and never repoints
 * `contentPointer` — the room's own SAVE remains the sole writer of the snapshot.
 *
 * Document semantics (constructing / replacing elements or ProseMirror nodes on the
 * doc) live in the caller-supplied mutator over the live `Y.Doc` (excalidraw-yjs for
 * whiteboards, @tiptap/y-tiptap for memos); this service owns only the transport,
 * durability, and idempotent retry.
 */
@Injectable()
export class CollaborationDocumentService {
  private readonly wsEndpoint: string;
  private readonly actorHeader: string;
  private readonly connectTimeoutMs: number;
  private readonly durabilityTimeoutMs: number;
  private readonly maxResendRetries = 2;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.wsEndpoint = this.configService
      .get('collaboration.service.url', { infer: true })
      .replace(/\/$/, '');
    this.actorHeader = this.configService.get(
      'collaboration.service.actor_id_header',
      { infer: true }
    );
    this.connectTimeoutMs = this.configService.get(
      'collaboration.service.connect_timeout',
      { infer: true }
    );
    this.durabilityTimeoutMs = this.configService.get(
      'collaboration.service.durability_timeout',
      { infer: true }
    );
  }

  /**
   * Join the room, run `reader` against the synced live `Y.Doc`, and leave.
   * The reader must be synchronous (the doc is only valid for the call).
   */
  async read<T>(
    documentId: string,
    type: CollaborationDocumentType,
    actorId: string,
    reader: (doc: Y.Doc) => T
  ): Promise<T> {
    const session = this.newSession(documentId, type, actorId);
    try {
      await session.connect(this.connectTimeoutMs);
      return reader(session.doc);
    } finally {
      session.close();
    }
  }

  /**
   * Join the room, apply `mutator` as ONE logical Yjs transaction (a single update
   * frame → one rate-limit token), and return only once the change is DURABLE via a
   * CORRELATED persist barrier (`requestDurability`): the server answers this session's
   * `persist-request(requestId)` with `persisted(requestId)` once that exact state has
   * reached the durable store. A room-wide `saved` broadcast never stands in for it. A
   * read-only join fails immediately. On an ambiguous transport/persist failure before
   * durability, reconnects (a fresh session → a fresh requestId) and resends the SAME
   * update bytes (Yjs-idempotent). A deleted board (`DocumentPurgingError`) and a
   * server-refused update (`UpdateRejectedError` — resending identical rejected bytes is
   * futile) are both terminal.
   */
  async mutate(
    documentId: string,
    type: CollaborationDocumentType,
    actorId: string,
    mutator: (doc: Y.Doc) => void
  ): Promise<void> {
    let update: Uint8Array | null = null;
    for (let attempt = 0; attempt <= this.maxResendRetries; attempt++) {
      const session = this.newSession(documentId, type, actorId);
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
        await session.requestDurability(this.durabilityTimeoutMs);
        return; // durable
      } catch (err) {
        if (
          err instanceof DocumentPurgingError ||
          err instanceof ReadOnlyRoomError ||
          err instanceof UpdateRejectedError ||
          (err instanceof CollaborationSessionEndError &&
            err.disposition !== 'transient') ||
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
    type: CollaborationDocumentType,
    actorId: string
  ): CollaborationDocumentSession {
    const url = `${this.wsEndpoint}/collab/${encodeURIComponent(documentId)}?type=${type}`;
    const headers = { [this.actorHeader]: actorId };
    return new CollaborationDocumentSession(url, headers, documentId);
  }
}
