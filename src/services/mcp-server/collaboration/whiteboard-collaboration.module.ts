import { Module } from '@nestjs/common';
import { WhiteboardCollaborationService } from './whiteboard-collaboration.service';

/**
 * Provides the assistant's native Yjs whiteboard client path — the ephemeral
 * server-side collaborator MCP tools use to read/mutate whiteboards through the
 * live collaboration room (never file storage, never a scene re-encode).
 */
@Module({
  providers: [WhiteboardCollaborationService],
  exports: [WhiteboardCollaborationService],
})
export class WhiteboardCollaborationModule {}
