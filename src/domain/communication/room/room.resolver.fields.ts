import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoomUnreadCounts } from './dto/room.dto.unread.counts';
import { RoomDataLoader } from './room.data.loader';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(
    private readonly roomService: RoomService,
    private readonly authorizationService: AuthorizationService,
    private readonly roomDataLoader: RoomDataLoader
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: false,
    description: 'Messages in this Room.',
  })
  async messages(@Parent() room: IRoom): Promise<IMessage[]> {
    const result = await this.roomService.getMessages(room);
    if (!result) return [];
    return result;
  }

  @ResolveField('vcInteractions', () => [IVcInteraction], {
    nullable: false,
    description: 'Virtual Contributor Interactions in this Room.',
  })
  async vcInteractions(
    @Parent() room: IRoom,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IVcInteraction[]> {
    const reloadedRoom = await this.roomService.getRoomOrFail(room.id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('threadIds', {
      type: () => [String],
      nullable: true,
      description:
        'Optional thread IDs to get per-thread unread counts. If not provided, only room-level count is returned.',
    })
    threadIds?: string[]
  ): Promise<RoomUnreadCounts> {
    const reloadedRoom = await this.roomService.getRoomOrFail(room.id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      reloadedRoom.authorization,
      AuthorizationPrivilege.READ,
      `resolve unread counts for: ${reloadedRoom.id}`
    );

    return this.roomService.getUnreadCounts(
      reloadedRoom,
      agentInfo.agentID,
      threadIds
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('unreadCount', () => Int, {
    nullable: false,
    description:
      'Simple unread message count for the current user. Use unreadCounts for per-thread breakdown.',
  })
  async unreadCount(
    @Parent() room: IRoom,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<number> {
    return this.roomDataLoader.loadUnreadCount(room.id, agentInfo.agentID);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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
