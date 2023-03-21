import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { IAgent } from '@domain/agent/agent';
import { IUser, User } from '@domain/community/user';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from './user.service';
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import {
  UserAgentLoaderCreator,
  UserProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';

@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private preferenceSetService: PreferenceSetService,
    private messagingService: MessagingService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this User.',
  })
  @Profiling.api
  async profile(
    @Parent() user: User,
    @Loader(UserProfileLoaderCreator) loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(user.id);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this User.',
  })
  @Profiling.api
  async agent(
    @Parent() user: User,
    @Loader(UserAgentLoaderCreator) loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(user.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The Authorization for this User.',
  })
  @Profiling.api
  async authorization(@Parent() parent: User) {
    // Reload to ensure the authorization is loaded
    const user = await this.userService.getUserOrFail(parent.id);

    return user.authorization;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this user',
  })
  @Profiling.api
  async preferences(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPreference[]> {
    if (
      !(await this.isAccessGranted(
        user,
        agentInfo,
        AuthorizationPrivilege.UPDATE
      ))
    ) {
      return [];
    }
    const preferenceSet = await this.userService.getPreferenceSetOrFail(
      user.id
    );
    return await this.preferenceSetService.getPreferencesOrFail(preferenceSet);
  }

  @ResolveField('communityRooms', () => [CommunicationRoomResult], {
    nullable: true,
    description: 'The Community rooms this user is a member of',
  })
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
  ): Promise<string | 'not accessible'> {
    if (
      await this.isAccessGranted(user, agentInfo, AuthorizationPrivilege.READ)
    ) {
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
  ): Promise<string | 'not accessible'> {
    if (
      await this.isAccessGranted(user, agentInfo, AuthorizationPrivilege.READ)
    ) {
      return user.phone;
    }
    return 'not accessible';
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('isContactable', () => Boolean, {
    nullable: false,
    description: 'Can a message be sent to this User.',
  })
  @Profiling.api
  async isContactable(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user: ${agentInfo.email} can contact user: ${user.email}`
    );

    const preferenceSet = await this.userService.getPreferenceSetOrFail(
      user.id
    );

    return await this.messagingService.isContactableWithDirectMessage(
      preferenceSet
    );
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
