import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { IAgent } from '@domain/agent/agent';
import { IUser, User } from '@domain/community/user';
import { UseGuards } from '@nestjs/common';
import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from './user.service';
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { IProfile } from '../profile/profile.interface';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { logger } from 'matrix-js-sdk/lib/logger';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private preferenceSetService: PreferenceSetService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: true,
    description: 'The Profile for this User.',
  })
  @Profiling.api
  async profile(
    @Parent() user: User,
    @Context() { loaders }: IGraphQLContext
  ): Promise<IProfile> {
    return loaders.userProfileLoader.load(user.id);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(@Parent() user: User): Promise<IAgent> {
    return await this.userService.getAgent(user.id);
  }

  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this user',
  })
  @Profiling.api
  async preferences(@Parent() user: User): Promise<IPreference[]> {
    const preferenceSet = await this.userService.getPreferenceSetOrFail(
      user.id
    );
    return await this.preferenceSetService.getPreferencesOrFail(preferenceSet);
  }

  @ResolveField('communityRooms', () => [CommunicationRoomResult], {
    nullable: true,
    description: 'The Community rooms this user is a member of',
  })
  @Profiling.api
  async communityRooms(
    @Parent() user: User
  ): Promise<CommunicationRoomResult[]> {
    return await this.userService.getCommunityRooms(user);
  }

  @ResolveField('directRooms', () => [DirectRoomResult], {
    nullable: true,
    description: 'The direct rooms this user is a member of',
  })
  @Profiling.api
  async directRooms(@Parent() user: User): Promise<DirectRoomResult[]> {
    return this.userService.getDirectRooms(user);
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
    if (
      await this.isAccessGranted(user, agentInfo, AuthorizationPrivilege.READ)
    ) {
      return user.email;
    }
    logger.warn(
      `Not able to grant access to agent ${agentInfo} for user ${user}`
    );
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
    if (
      await this.isAccessGranted(user, agentInfo, AuthorizationPrivilege.READ)
    ) {
      return user.phone;
    }
    return 'not accessible';
  }

  private async isAccessGranted(
    user: IUser,
    agentInfo: AgentInfo,
    privilege: AuthorizationPrivilege
  ) {
    // needs to be loaded if you are not going through the orm layer
    // e.g. pagination is going around the orm layer
    const { authorization } = await this.userService.getUserOrFail(user.id, {
      relations: ['authorization'],
    });
    return await this.authorizationService.isAccessGranted(
      agentInfo,
      authorization,
      privilege
    );
  }
}
