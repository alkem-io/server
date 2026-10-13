import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Injectable } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { IRoom } from './room.interface';

/** Existing message gates shared by text, upload, send and reply. */
@Injectable()
export class RoomAttachmentAuthorization {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly rooms: RoomResolverService,
    private readonly users: UserLookupService,
    private readonly communication: CommunicationAdapter
  ) {}

  async assertOperation(
    room: IRoom,
    actor: ActorContext,
    threadID?: string
  ): Promise<void> {
    this.authorization.grantAccessOrFail(
      actor,
      room.authorization,
      threadID
        ? AuthorizationPrivilege.CREATE_MESSAGE_REPLY
        : AuthorizationPrivilege.CREATE_MESSAGE,
      `room message operation: ${room.id}`
    );
    if (room.type === RoomType.CALLOUT) {
      const callout = await this.rooms.getCalloutForRoom(room.id);
      if (!callout.settings.framing.commentsEnabled)
        throw new CalloutClosedException(
          'New comments on a closed Callout are not allowed'
        );
    }
    if (room.type !== RoomType.CONVERSATION_DIRECT) return;
    const members = await this.communication.getRoomMembers(room.id);
    const receiverId = members.find(id => id !== actor.actorID);
    if (!receiverId) return;
    const receiver = await this.users.getUserById(receiverId);
    if (!receiver) return;
    const full = await this.users.getUserByIdOrFail(receiver.id, {
      relations: { settings: true },
    });
    if (!full.settings.communication.allowOtherUsersToSendMessages) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.COMMUNICATION,
        { receiverId: receiver.id, senderId: actor.actorID }
      );
    }
  }
}
