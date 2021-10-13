import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';
import { convertFromMatrixMessage } from '@services/platform/communication/communication.dto.message.result';
import { RoomInvitationReceived } from '@services/platform/communication/communication.dto.room.invitation.received';
import {
  IMatrixEventHandler,
  RoomTimelineEvent,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixClient } from '../types/matrix.client.type';

const noop = function () {
  // empty
};

export class AutoAcceptRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    adapter: MatrixRoomAdapterService
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
            await adapter.storeDirectMessageRoom(client, roomId, senderId);
          }
        }
      },
    };
  }
}

export class RoomTimelineMonitorFactory {
  static create(
    matrixClient: MatrixClient,
    onMessageReceived: (event: CommunicationMessageReceived) => void
  ): IMatrixEventHandler['roomTimelineMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ event, room }: RoomTimelineEvent) => {
        const message = convertFromMatrixMessage(
          event,
          matrixClient.getUserId()
        );

        // TODO Notifications - Allow the client to see the event and then mark it as read
        // With the current behavior the message will automatically be marked as read
        // to ensure that we are returning only the actual updates
        await matrixClient.sendReadReceipt(event, {});

        if (message) {
          onMessageReceived({
            message,
            roomId: room.roomId,
            userID: message.receiver,
            communityId: undefined,
            roomName: room.name,
          });
        }
      },
    };
  }
}

export class RoomMonitorFactory {
  static create(
    onMessageReceived: (event: RoomInvitationReceived) => void
  ): IMatrixEventHandler['roomMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ room }: { room: MatrixRoom }) => {
        onMessageReceived({
          roomId: room?.roomId,
        });
      },
    };
  }
}
