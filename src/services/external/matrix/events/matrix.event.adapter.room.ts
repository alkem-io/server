import { LogContext } from '@common/enums';
import { CommunicationEventMessageReceived } from '@domain/communication/communication/dto/communication.dto.event.message.received';
import { LoggerService } from '@nestjs/common';
import { MatrixRoomInvitationReceived } from '@services/platform/communication-adapter/dto/communication.dto.room.invitation.received';
import {
  IMatrixEventHandler,
  RoomTimelineEvent,
} from '@services/external/matrix/events/matrix.event.dispatcher';
import { MatrixMessageAdapter } from '../adapter-message/matrix.message.adapter';
import { MatrixRoom } from '../adapter-room/matrix.room';
import { MatrixRoomAdapter } from '../adapter-room/matrix.room.adapter';
import { MatrixClient } from '../types/matrix.client.type';

const noop = function () {
  // empty
};

export const roomMembershipLeaveGuardFactory = (
  targetUserID: string,
  targetRoomID: string
) => {
  return ({ event, member }: any) => {
    const content = event.getContent();
    if (content.membership === 'leave' && member.userId === targetUserID) {
      const roomId = event.getRoomId();

      return roomId === targetRoomID;
    }

    return false;
  };
};
export class ForgetRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    logger: LoggerService,
    onRoomLeft: () => void,
    onComplete = noop,
    error: (err: any) => void = noop
  ): IMatrixEventHandler['roomMemberMembershipMonitor'] {
    return {
      complete: onComplete,
      error: error,
      next: async ({ event, member }) => {
        const content = event.getContent();
        const roomId = event.getRoomId();
        await client.forget(roomId);
        logger.verbose?.(
          `[Membership] Room [${roomId}] left - user (${member.userId}), membership status ${content.membership}`,
          LogContext.COMMUNICATION
        );
        onRoomLeft();
      },
    };
  }
}

export const autoAcceptRoomGuardFactory = (
  targetUserID: string,
  targetRoomID: string
) => {
  return ({ event, member }: any) => {
    const content = event.getContent();
    if (content.membership === 'invite' && member.userId === targetUserID) {
      const roomId = event.getRoomId();

      return roomId === targetRoomID;
    }

    return false;
  };
};
export class AutoAcceptSpecificRoomMembershipMonitorFactory {
  static create(
    client: MatrixClient,
    roomAdapter: MatrixRoomAdapter,
    logger: LoggerService,
    targetRoomId: string,
    onRoomJoined: () => void,
    onComplete = noop,
    error: (err: any) => void = noop
  ): IMatrixEventHandler['roomMemberMembershipMonitor'] {
    return {
      complete: onComplete,
      error: error,
      next: async ({ event, member }) => {
        const content = event.getContent();
        if (
          content.membership === 'invite' &&
          member.userId === client.credentials.userId
        ) {
          const roomId = event.getRoomId();

          if (roomId !== targetRoomId) {
            logger.verbose?.(
              `[Membership] skipping invitation for user (${member.userId}) to room: ${roomId}`,
              LogContext.COMMUNICATION
            );
          }

          const senderId = event.getSender();

          logger.verbose?.(
            `[Membership] accepting invitation for user (${member.userId}) to room: ${roomId}`,
            LogContext.COMMUNICATION
          );
          await client.joinRoom(roomId);
          if (content.is_direct) {
            await roomAdapter.storeDirectMessageRoom(client, roomId, senderId);
          }
          logger.verbose?.(
            `[Membership] accepted invitation for user (${member.userId}) to room: ${roomId}`,
            LogContext.COMMUNICATION
          );
          onRoomJoined();
        }
      },
    };
  }
}

export class RoomTimelineMonitorFactory {
  static create(
    matrixClient: MatrixClient,
    messageAdapter: MatrixMessageAdapter,
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
        const ignoreMessage = messageAdapter.isEventToIgnore(event);

        // TODO Notifications - Allow the client to see the event and then mark it as read
        // With the current behavior the message will automatically be marked as read
        // to ensure that we are returning only the actual updates
        await matrixClient.sendReadReceipt(event, {});

        if (!ignoreMessage) {
          const message = messageAdapter.convertFromMatrixMessage(event);
          logger.verbose?.(
            `Triggering messageReceived event for msg body: ${
              event.getContent().body
            }`,
            LogContext.COMMUNICATION
          );

          onMessageReceived({
            message,
            roomId: room.roomId,
            communicationID: matrixClient.getUserId(),
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
