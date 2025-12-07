import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import {
  IVcInteraction,
  generateVcInteractionId,
} from '../vc-interaction/vc.interaction.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoomLookupService } from '../room-lookup/room.lookup.service';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(
    private roomService: RoomService,
    private roomLookupService: RoomLookupService,
    private authorizationService: AuthorizationService
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
      id: generateVcInteractionId(threadID, data.virtualContributorActorID),
      threadID,
      virtualContributorID: data.virtualContributorActorID,
    }));
  }
}
