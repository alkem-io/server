import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(private roomService: RoomService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: false,
    description: 'Messages in this Room.',
  })
  @Profiling.api
  async messages(@Parent() room: IRoom): Promise<IMessage[]> {
    const result = await this.roomService.getMessages(room);
    if (!result) return [];
    return result;
  }
}
