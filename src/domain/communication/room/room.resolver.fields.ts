import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorPrivilege,
  CurrentActor,
} from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(
    private readonly roomService: RoomService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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
    const interactionsByThread =
      reloadedRoom.vcData?.interactionsByThread || {};
    return Object.entries(interactionsByThread).map(([threadID, data]) => ({
      threadID,
      virtualContributorID: data.virtualContributorActorID,
    }));
  }
}
