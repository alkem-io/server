import { UseGuards } from '@nestjs/common';
import { Resolver, Parent, ResolveField } from '@nestjs/graphql';
import { User, IUser } from '@domain/community/user';
import { UserService } from './user.service';
import { IAgent } from '@domain/agent/agent';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CommunicationService } from '@src/services/platform/communication/communication.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';
import { CommunityRoom } from '@services/platform/communication';
import { DirectRoom } from '@services/platform/communication/communication.room.dto.direct';
@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
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
    return await this.communicationService.getCommunityRooms(user.email);
  }

  @ResolveField('directRooms', () => [DirectRoom], {
    nullable: true,
    description: 'The direct rooms this user is a member of',
  })
  @Profiling.api
  async directRooms(@Parent() user: User): Promise<DirectRoom[]> {
    return await this.communicationService.getDirectRooms(user.email);
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
