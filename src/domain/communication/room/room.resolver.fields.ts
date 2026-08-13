import { AuthorizationPrivilege } from '@common/enums';
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
import { MessageAttachmentService } from '../message-attachment/message.attachment.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { RoomUnreadCounts } from './dto/room.dto.unread.counts';
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
    // Feature 013 (C2): this is the single point where a room's WHOLE
    // (unpaginated) message list materializes, so resolve the room's attachment
    // bucket ONCE here and stamp it on every message. The per-message
    // `Message.attachments` resolver then takes its zero-query fast path instead
    // of re-resolving room → conversation/callout → storage aggregator for each
    // message individually. Best-effort: never throws, never changes what the
    // field returns.
    await this.messageAttachmentService.stampAttachmentBucket(room, result);
    return result;
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
