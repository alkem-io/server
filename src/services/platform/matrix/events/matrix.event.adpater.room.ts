import { IMatrixEventHandler } from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { MatrixClient } from '@src/services/platform/matrix/agent-pool/matrix.client.types';
import { MatrixRoomEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.room';

const noop = function() {
  // empty
};

export class AutoAcceptRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    adapter: MatrixRoomEntityAdapter
  ): IMatrixEventHandler['roomMemberMembershipMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ event, member }) => {
        const content = event.getContent();
        if (
          content.membership === 'invite' &&
          member.userId === client.credentials.userId
        ) {
          const roomId = event.getRoomId();
          const senderId = event.getSender();

          await client.joinRoom(roomId);
          if (content.is_direct) {
            await adapter.setDmRoom(roomId, senderId);
          }
        }
      },
    };
  }
}
