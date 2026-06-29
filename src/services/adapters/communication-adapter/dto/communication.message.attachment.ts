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
  width?: number;
  height?: number;
}
