import '../../../config/aliases';
import { CollaborationDocumentSession } from '../../collaboration-client/collaboration-document.session';
import { WhiteboardExecutorChild } from './whiteboard-executor.child';

const child = new WhiteboardExecutorChild(
  message => {
    if (!process.connected) return;
    process.send!(message, undefined, undefined, (error: Error | null) => {
      if (error) child.disconnect();
    });
  },
  () => {
    if (!process.connected) process.exit(0);
    process.exitCode = 0;
    process.disconnect?.();
  },
  (grant, lost) =>
    new CollaborationDocumentSession(
      `${process.env.MCP_EXECUTOR_COLLAB_URL!.replace(/\/$/, '')}/collab/${encodeURIComponent(grant.documentId)}?type=whiteboard`,
      { [process.env.MCP_EXECUTOR_ACTOR_HEADER!]: grant.actorId },
      grant.documentId,
      lost
    )
);
process.on('message', message => child.receive(message));
process.on('disconnect', () => child.disconnect());
