import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { IVcInteraction } from '../vc-interaction/vc.interaction.interface';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(private roomService: RoomService) {}

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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('vcInteractions', () => [IVcInteraction], {
    nullable: false,
    description: 'Virtual Contributor Interactions in this Room.',
  })
  async vcInteractions(@Parent() room: IRoom): Promise<IVcInteraction[]> {
    const result = await this.roomService.getVcInteractions(room.id);
    if (!result) return [];
    return result;
  }
}
