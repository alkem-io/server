import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { IAgent } from '@domain/agent/agent';
import { IUser, User } from '@domain/community/user';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunityRoom } from '@services/platform/communication';
import { DirectRoom } from '@services/platform/communication/communication.room.dto.direct';
import { CommunicationService } from '@src/services/platform/communication/communication.service';
import { UserService } from './user.service';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private communicationService: CommunicationService
  ) {}

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user.id);
  }

  @ResolveField('communityRooms', () => [CommunityRoom], {
    nullable: true,
    description: 'The Community rooms this user is a member of',
  })
  @Profiling.api
  async communityRooms(@Parent() user: User): Promise<CommunityRoom[]> {
    const rooms = await this.communicationService.getCommunityRooms(user.email);

    await this.userService.populateRoomMessageSenders(rooms);

    return rooms;
  }

  @ResolveField('directRooms', () => [DirectRoom], {
    nullable: true,
    description: 'The direct rooms this user is a member of',
  })
  @Profiling.api
  async directRooms(@Parent() user: User): Promise<DirectRoom[]> {
    const rooms = await this.communicationService.getDirectRooms(user.email);

    await this.userService.populateRoomMessageSenders(rooms);

    return rooms;
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
    // Need to do inside rather than as decorator so can return a replacement string
    const accessGranted = await this.authorizationService.isAccessGranted(
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
    const accessGranted = await this.authorizationService.isAccessGranted(
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
