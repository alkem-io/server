import { Module } from '@nestjs/common';
import { CollaborationDocumentService } from './collaboration-document.service';

/**
 * Provides the shared server-side native-Yjs collaboration client — the ephemeral
 * collaborator used to read/mutate a whiteboard or memo through its live collaboration
 * room (never the document snapshot in file storage, never a contentPointer repoint;
 * the room's SAVE is the sole snapshot writer). Consumed by MCP tools and by the domain
 * content-replace paths (callout-framing / template).
 */
@Module({
  providers: [CollaborationDocumentService],
  exports: [CollaborationDocumentService],
})
export class CollaborationClientModule {}
