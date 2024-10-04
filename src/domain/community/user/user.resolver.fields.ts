import { AuthorizationAgentPrivilege, CurrentUser } from '@common/decorators';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { IAgent } from '@domain/agent/agent';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from './user.service';
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UserStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/user.storage.aggregator.loader.creator';
import {
  AgentLoaderCreator,
  AuthorizationLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { User } from './user.entity';
import { AuthenticationType } from '@common/enums/authentication.type';

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
  @UseGuards(GraphqlGuard)
  async profile(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: User })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(user.id);
    // Note: the user profile is public.
    // Check if the user can read the profile entity, not the actual User entity
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on User: ${profile.displayName} with current user being: ${agentInfo.userID}`
    );
    return profile;
  }

  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this User.',
  })
  async agent(
    @Parent() user: User,
    @Loader(AgentLoaderCreator, { parentClassRef: User })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(user.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The Authorization for this User.',
  })
  async authorization(
    @Parent() user: User,
    @Loader(AuthorizationLoaderCreator, { parentClassRef: User })
    loader: ILoader<IAuthorizationPolicy>
  ) {
    return loader.load(user.id);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this user',
  })
  async preferences(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPreference[]> {
    // reject when a basic user reads other user's preferences
    if (
      !(await this.isAccessGranted(
        user,
        agentInfo,
        AuthorizationPrivilege.READ_USER_SETTINGS
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
  async directRooms(@Parent() user: User): Promise<DirectRoomResult[]> {
    return this.userService.getDirectRooms(user);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('email', () => String, {
    nullable: false,
    description: 'The email address for this User.',
  })
  async email(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string | 'not accessible'> {
    if (
      await this.isAccessGranted(
        user,
        agentInfo,
        AuthorizationPrivilege.READ_USER_PII
      )
    ) {
      return user.email;
    }
    return 'not accessible';
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('phone', () => String, {
    nullable: true,
    description: 'The phone number for this User.',
  })
  async phone(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string | null | 'not accessible'> {
    if (
      await this.isAccessGranted(
        user,
        agentInfo,
        AuthorizationPrivilege.READ_USER_PII
      )
    ) {
      return user.phone ?? null;
    }
    return 'not accessible';
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The account hosted by this User.',
  })
  async account(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IAccount | undefined> {
    const accountVisible =
      user.id === agentInfo.userID || // user can see their own account
      (await this.isAccessGranted(
        user,
        agentInfo,
        AuthorizationPrivilege.READ_USER_PII
      ));
    if (accountVisible) {
      return await this.userService.getAccount(user);
    }
    return undefined;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('isContactable', () => Boolean, {
    nullable: false,
    description: 'Can a message be sent to this User.',
  })
  async isContactable(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description:
      'The StorageAggregator for managing storage buckets in use by this User',
  })
  @UseGuards(GraphqlGuard)
  async storageAggregator(
    @Parent() user: IUser,
    @Loader(UserStorageAggregatorLoaderCreator)
    loader: ILoader<IStorageAggregator>
  ): Promise<IStorageAggregator> {
    return loader.load(user.id);
  }

  @ResolveField('authenticationMethod', () => AuthenticationType, {
    nullable: true,
    description:
      'The Authentication Method used for this User. One of email, linkedin, microsoft, or unknown',
  })
  @UseGuards(GraphqlGuard)
  async authenticationMethod(
    @Parent() user: IUser,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AuthenticationType> {
    const isCurrentUser = user.id === agentInfo.userID;
    const platformAccessGranted = this.authorizationService.isAccessGranted(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN
    );
    if (isCurrentUser || platformAccessGranted) {
      return this.userService.getAuthenticationTypeByEmail(user.email);
    }
    return AuthenticationType.UNKNOWN;
  }

  private async isAccessGranted(
    user: IUser,
    agentInfo: AgentInfo,
    privilege: AuthorizationPrivilege
  ): Promise<boolean> {
    // needs to be loaded if you are not going through the orm layer
    // e.g. pagination is going around the orm layer
    const { authorization } = await this.userService.getUserOrFail(user.id, {
      relations: { authorization: true },
    });
    const accessGranted = this.authorizationService.isAccessGranted(
      agentInfo,
      authorization,
      privilege
    );
    if (!accessGranted) {
      // Check if the user has a particular credential, which signals that it should be able to access the user
      // todo: remove later, this is code to track down a particular race condition: https://github.com/alkem-io/notifications/issues/283
      const hasGlobalAdminCredential = agentInfo.credentials.some(
        credential =>
          credential.type === AuthorizationCredential.GLOBAL_COMMUNITY_READ ||
          credential.type === AuthorizationCredential.GLOBAL_SUPPORT
      );
      if (hasGlobalAdminCredential) {
        this.logger.error(
          `Agent: ${agentInfo.email} is not authorized to access user: ${
            user.email
          }: authorization policy of user: ${JSON.stringify(authorization)}`
        );
      }
    }
    return accessGranted;
  }
}
