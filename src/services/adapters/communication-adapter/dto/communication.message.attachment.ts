/**
 * A resolved outbound attachment passed to the communication adapter (feature
 * 013). Mirrors the matrix-adapter-lib `AttachmentRef` shape; the adapter
 * fetches the document bytes from file-service, uploads them to the homeserver,
 * and embeds `io.alkemio.document_id = documentId` on the outbound media event.
 */
export interface CommunicationMessageAttachment {
  documentId: string;
  displayName: string;
  mimeType: string;
  size: number;
  /**
   * Intrinsic image dimensions, images only and best-effort — they become the
   * outbound `m.image` event's `info.w`/`info.h`, which is what stops Element
   * (and every other Matrix client) reflowing its layout as the image loads.
   * Absent for non-images, and absent whenever the best-effort lookup did not
   * answer: never load-bearing for the send.
   */
  width?: number;
  height?: number;
}
