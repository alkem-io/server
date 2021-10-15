import { LogContext } from '@common/enums';
import { CommunicationEventMessageReceived } from '@domain/common/communication/communication.dto.event.message.received';
import { LoggerService } from '@nestjs/common';
import { MatrixRoomInvitationReceived } from '@services/platform/communication/dto/communication.dto.room.invitation.received';
import {
  IMatrixEventHandler,
  RoomTimelineEvent,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { MatrixMessageAdapterService } from '../adapter-message/matrix.message.adapter.service';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixClient } from '../types/matrix.client.type';

const noop = function () {
  // empty
};

export class AutoAcceptRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    roomAdapter: MatrixRoomAdapterService
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
            await roomAdapter.storeDirectMessageRoom(client, roomId, senderId);
          }
        }
      },
    };
  }
}

export class RoomTimelineMonitorFactory {
  static create(
    matrixClient: MatrixClient,
    messageAdapterService: MatrixMessageAdapterService,
    logger: LoggerService,
    onMessageReceived: (event: CommunicationEventMessageReceived) => void
  ): IMatrixEventHandler['roomTimelineMonitor'] {
    return {
      complete: noop,
      error: noop,
      next: async ({ event, room }: RoomTimelineEvent) => {
        logger.verbose?.(
          `RoomTimelineMonitor: received event of type ${
            event.event.type
          } with id ${event.event.event_id} and body: ${
            event.getContent().body
          }`,
          LogContext.COMMUNICATION
        );
        const ignoreMessage = messageAdapterService.isMessageToIgnore(event);

        // TODO Notifications - Allow the client to see the event and then mark it as read
        // With the current behavior the message will automatically be marked as read
        // to ensure that we are returning only the actual updates
        await matrixClient.sendReadReceipt(event, {});

        if (!ignoreMessage) {
          const message = messageAdapterService.convertFromMatrixMessage(
            event,
            matrixClient.getUserId()
          );
          logger.verbose?.(
            `Triggering message Received event for msg body: ${
              event.getContent().body
            }`,
            LogContext.COMMUNICATION
          );

          onMessageReceived({
            message,
            roomId: room.roomId,
            communicationID: message.receiverID,
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
    onMessageReceived: (event: MatrixRoomInvitationReceived) => void
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
