import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MessageID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  CurrentActor,
} from '@src/common/decorators';
import { IMessage } from '../message/message.interface';
import { IMessageAttachment } from '../message-attachment/message.attachment.interface';
import { MessageAttachmentService } from '../message-attachment/message.attachment.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { MessageAttachmentMediaInput } from './dto/room.dto.message.attachment.media';
import { RoomUnreadCounts } from './dto/room.dto.unread.counts';

const MAX_MEDIA_ATTACHMENTS_PER_CALL = 100;

import { RoomDataLoader } from './room.data.loader';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(
    private readonly roomService: RoomService,
    private readonly authorizationService: AuthorizationService,
    private readonly roomDataLoader: RoomDataLoader,
    private readonly messageAttachmentService: MessageAttachmentService
  ) {}

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: false,
    description: 'Messages in this Room.',
  })
  async messages(@Parent() room: IRoom): Promise<IMessage[]> {
    const result = await this.roomService.getMessages(room);
    if (!result) return [];
    // Share one bucket/document lookup across the history field resolvers.
    await this.messageAttachmentService.stampAttachmentBucket(room, result);
    return result;
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messageAttachments', () => [IMessageAttachment], {
    nullable: false,
    description:
      'Resolves the attachments of media events read directly from Matrix, one entry per input in input order. Unavailable documents retain their event filename without a download URL.',
  })
  async messageAttachments(
    @Parent() room: IRoom,
    @CurrentActor() actorContext: ActorContext,
    @Args('media', {
      type: () => [MessageAttachmentMediaInput],
      nullable: false,
      description: `The media events to resolve (at most ${MAX_MEDIA_ATTACHMENTS_PER_CALL}).`,
    })
    media: MessageAttachmentMediaInput[]
  ): Promise<IMessageAttachment[]> {
    if (media.length > MAX_MEDIA_ATTACHMENTS_PER_CALL) {
      throw new ValidationException(
        `At most ${MAX_MEDIA_ATTACHMENTS_PER_CALL} media entries per call`,
        LogContext.COMMUNICATION
      );
    }
    return this.messageAttachmentService.resolveMediaAttachments(
      room,
      media.map(item => ({
        media_id: item.mediaID,
        document_id: item.documentID,
        display_name: item.displayName ?? '',
        // The read path takes type and size from the stored document.
        mime_type: '',
        size: 0,
        width: item.width,
        height: item.height,
      })),
      actorContext
    );
  }

  @ResolveField('vcInteractions', () => [IVcInteraction], {
    nullable: false,
    description: 'Virtual Contributor Interactions in this Room.',
  })
  async vcInteractions(
    @Parent() room: IRoom,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IVcInteraction[]> {
    const reloadedRoom = await this.roomService.getRoomOrFail(room.id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      reloadedRoom.authorization,
      AuthorizationPrivilege.READ,
      `resolve vc interactions for: ${reloadedRoom.id}`
    );

    // Convert JSON map to array of IVcInteraction
    const vcInteractionsByThread = reloadedRoom.vcInteractionsByThread || {};
    return Object.entries(vcInteractionsByThread).map(([threadID, data]) => ({
      threadID,
      virtualContributorID: data.virtualContributorActorID,
    }));
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('unreadCounts', () => RoomUnreadCounts, {
    nullable: false,
    description: 'Unread message counts for the current user in this Room.',
  })
  async unreadCounts(
    @Parent() room: IRoom,
    @CurrentActor() actorContext: ActorContext,
    @Args('threadIds', {
      type: () => [MessageID],
      nullable: true,
      description:
        'Optional thread IDs to get per-thread unread counts. If not provided, only room-level count is returned.',
    })
    threadIds?: string[]
  ): Promise<RoomUnreadCounts> {
    const reloadedRoom = await this.roomService.getRoomOrFail(room.id);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      reloadedRoom.authorization,
      AuthorizationPrivilege.READ,
      `resolve unread counts for: ${reloadedRoom.id}`
    );

    return this.roomService.getUnreadCounts(
      reloadedRoom,
      actorContext.actorID,
      threadIds
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('unreadCount', () => Int, {
    nullable: false,
    description:
      'Simple unread message count for the current user. Use unreadCounts for per-thread breakdown.',
  })
  async unreadCount(
    @Parent() room: IRoom,
    @CurrentActor() actorContext: ActorContext
  ): Promise<number> {
    return this.roomDataLoader.loadUnreadCount(room.id, actorContext.actorID);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('lastMessage', () => IMessage, {
    nullable: true,
    description:
      'The last message sent to the Room. Useful for conversation previews.',
  })
  async lastMessage(@Parent() room: IRoom): Promise<IMessage | null> {
    return this.roomDataLoader.loadLastMessage(room.id);
  }
}
