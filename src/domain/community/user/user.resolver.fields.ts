import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { User, IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { IAgent } from '@domain/agent/agent';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CommunicationService } from '@src/services/platform/communication/communication.service';
import {
  CommunicationRoomDetailsResult,
  CommunicationRoomResult,
} from '@src/services/platform/communication';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private userService: UserService,
    private communicationService: CommunicationService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('rooms', () => [CommunicationRoomResult], {
    nullable: true,
    description: 'The rooms this user is a member of',
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

  @UseGuards(GraphqlGuard)
  @ResolveField('email', () => String, {
    nullable: false,
    description: 'The email address for this User.',
  })
  @Profiling.api
  async email(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const accessGranted = await this.authorizationEngine.isAccessGranted(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.READ
    );
    if (accessGranted) {
      return user.email;
    }
    return 'not accessible';
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('phone', () => String, {
    nullable: false,
    description: 'The phone number for this User.',
  })
  @Profiling.api
  async phone(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const accessGranted = await this.authorizationEngine.isAccessGranted(
      agentInfo,
      user.authorization,
      AuthorizationPrivilege.READ
    );
    if (accessGranted) {
      return user.phone;
    }
    return 'not accessible';
  }
}
