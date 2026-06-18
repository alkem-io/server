import { CollaborationContentType } from '@common/enums/collaboration.content.type';

/**
 * One record yielded by the one-time migration read (FR-009 / US4). The
 * migration job (WS-E, owned by the collab Go core's v2 decoder + the
 * whiteboard-JSON -> Y.Doc seeding) consumes these; this server slice only
 * provides the read access.
 *
 * - memo: `content` is the raw Yjs v2 binary state as base64
 *   (`Memo.content.toString('base64')`); `undefined` for a never-edited memo
 *   (the job seeds an empty Y.Doc — not a failure).
 * - whiteboard: `content` is the decompressed Excalidraw JSON string (the
 *   entity `@AfterLoad` already decompresses); `flagged = true` marks a
 *   decompression failure surfaced for manual review (not silently dropped).
 */
export interface LegacyContentRecord {
  id: string;
  contentType: CollaborationContentType;
  content?: string;
  authorizationPolicyId?: string;
  /** set when the legacy blob could not be read (e.g. corrupt compression). */
  flagged?: boolean;
  flagReason?: string;
}
