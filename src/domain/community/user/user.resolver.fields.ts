import { CurrentUser } from '@common/decorators';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAgent } from '@domain/agent/agent';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from './user.service';
import { DirectRoomResult } from '../../communication/communication/dto/communication.dto.send.direct.message.user.result';
import { IProfile } from '@domain/common/profile/profile.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UserStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/user.storage.aggregator.loader.creator';
import {
  AgentLoaderCreator,
  AuthorizationLoaderCreator,
  ProfileLoaderCreator,
  UserSettingsLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { User } from './user.entity';
import { AuthenticationType } from '@common/enums/authentication.type';
import { UserAuthenticationResult } from './dto/roles.dto.authentication.result';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUserSettings } from '../user-settings/user.settings.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this User.',
  })
  async profile(
    @Parent() user: User,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: User,
      checkResultPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(user.id);
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

  @ResolveField('directRooms', () => [DirectRoomResult], {
    nullable: true,
    description: 'The direct rooms this user is a member of',
  })
  async directRooms(@Parent() user: User): Promise<DirectRoomResult[]> {
    return this.userService.getDirectRooms(user);
  }

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

  @ResolveField('settings', () => IUserSettings, {
    nullable: false,
    description: 'The settings for this User.',
  })
  settings(
    @Parent() user: IUser,
    @Loader(UserSettingsLoaderCreator, {
      parentClassRef: User,
      checkParentPrivilege: AuthorizationPrivilege.READ_USER_SETTINGS,
    })
    loader: ILoader<IUserSettings>
  ): Promise<IUserSettings> {
    return loader.load(user.id);
  }

  @ResolveField('isContactable', () => Boolean, {
    nullable: false,
    description: 'Can a message be sent to this User.',
  })
  async isContactable(
    @Parent() user: User,
    @Loader(UserSettingsLoaderCreator, {
      parentClassRef: User,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IUserSettings>
  ): Promise<boolean> {
    const userSettings = await loader.load(user.id);

    return userSettings.communication.allowOtherUsersToSendMessages;
  }

  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description:
      'The StorageAggregator for managing storage buckets in use by this User',
  })
  async storageAggregator(
    @Parent() user: IUser,
    @Loader(UserStorageAggregatorLoaderCreator, {
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IStorageAggregator>
  ): Promise<IStorageAggregator> {
    return loader.load(user.id);
  }

  @ResolveField('authentication', () => UserAuthenticationResult, {
    nullable: true,
    description: 'Details about the authentication used for this User.',
  })
  async authentication(
    @Parent() user: IUser,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<UserAuthenticationResult> {
    const isCurrentUser = user.id === agentInfo.userID;
    const platformAccessGranted = this.authorizationService.isAccessGranted(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN
    );
    const result: UserAuthenticationResult = {
      methods: [AuthenticationType.UNKNOWN],
      createdAt: undefined,
      authenticatedAt: undefined,
    };
    if (isCurrentUser || platformAccessGranted) {
      const identity = await this.kratosService.getIdentityByEmail(user.email);
      if (identity) {
        result.methods =
          await this.kratosService.getAuthenticationTypeFromIdentity(identity);
        result.createdAt = await this.kratosService.getCreatedAt(identity);
        result.authenticatedAt =
          await this.kratosService.getAuthenticatedAt(identity);
      }
    }

    return result;
  }

  @ResolveField(() => IRoom, {
    nullable: true,
    description: 'Guidance Chat Room for this user',
  })
  async guidanceRoom(
    @Parent() user: User,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IRoom | undefined> {
    const { guidanceRoom } = await this.userService.getUserOrFail(user.id, {
      relations: { guidanceRoom: true },
    });
    if (!guidanceRoom) {
      return undefined;
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      guidanceRoom.authorization,
      AuthorizationPrivilege.READ,
      `guidance Room: ${guidanceRoom.id}`
    );
    return guidanceRoom;
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
