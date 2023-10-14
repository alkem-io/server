import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { IMessage } from '../message/message.interface';
import { IRoom } from './room.interface';
import { RoomService } from './room.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';

@Resolver(() => IRoom)
export class RoomResolverFields {
  constructor(
    private roomService: RoomService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [IMessage], {
    nullable: false,
    description: 'Messages in this Room.',
  })
  @Profiling.api
  async messages(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() room: IRoom
  ): Promise<IMessage[]> {
    //toDo - vyanakiev - this is an excessive call, should not be neeeded, but auth was not loaded in this field resolver
    const roomWithAuth = await this.roomService.getRoomOrFail(room.id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roomWithAuth.authorization,
      AuthorizationPrivilege.READ,
      `Reading messages for room with id: ${room.id} failed!`
    );

    const result = await this.roomService.getMessages(roomWithAuth);
    if (!result) return [];
    return result;
  }
}
