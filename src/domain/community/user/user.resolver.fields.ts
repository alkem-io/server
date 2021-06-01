import { Args, Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { User } from '@domain/community/user/user.entity';
import { UserService } from './user.service';
import { IAgent } from '@domain/agent/agent';
import { Profiling } from '@common/decorators';
import { IUser } from '@domain/community/user';
import {
  CommunicationRoomDetailsResult,
  CommunicationRoomResult,
} from '@src/services/communication';
import { CommunicationService } from '@src/services/communication/communication.service';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private userService: UserService,
    private communicationService: CommunicationService
  ) {}

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('rooms', () => [CommunicationRoomResult], {
    nullable: true,
    description: 'An overview of the rooms this user is a member of',
  })
  @Profiling.api
  async rooms(@Parent() user: User): Promise<CommunicationRoomResult[]> {
    return await this.communicationService.getRooms(user.email);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('room', () => CommunicationRoomDetailsResult, {
    nullable: true,
    description: 'An overview of the rooms this user is a member of',
  })
  @Profiling.api
  async room(
    @Parent() user: User,
    @Args('roomID') roomID: string
  ): Promise<CommunicationRoomDetailsResult> {
    return await this.communicationService.getRoom(roomID, user.email);
  }
}
