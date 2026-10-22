import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthenticationType } from '@common/enums/authentication.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  ActorLoaderCreator,
  AuthorizationLoaderCreator,
  ProfileLoaderCreator,
  UserSettingsLoaderCreator,
} from '@core/dataloader/creators';
import { UserStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/user.storage.aggregator.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import {
  DELETED_USER_SENTINEL,
  DELETED_USER_SENTINEL_AUTHORIZATION,
  DELETED_USER_SENTINEL_ID,
} from '@domain/community/user/account-deletion/deleted.user.sentinel';
import { IUser } from '@domain/community/user/user.interface';
import { IAccount } from '@domain/space/account/account.interface';
import {
  HostedResourcesViewerScope,
  IAccountHostedResources,
} from '@domain/space/account/dto/account.hosted.resources';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUserSettings } from '../user-settings/user.settings.interface';
import { UserAuthenticationResult } from './dto/roles.dto.authentication.result';
import { User } from './user.entity';
import { UserService } from './user.service';

@InstrumentResolver()
@Resolver(() => IUser)
export class UserResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private kratosService: KratosService,
    private accountLookupService: AccountLookupService,
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
    // The deleted-user sentinel's id is never a real `user` row, so the
    // (non-null, one-to-one) profile loader would reject the whole batch
    // key with an EntityNotFoundException — this `@ResolveField` always
    // takes precedence over the sentinel's own in-memory `profile`
    // property, so that fallback is otherwise never consulted. Short-
    // circuit before the loader runs, returning the sentinel's static
    // profile directly, so an activity-feed entry attributed to a departed
    // user still renders its neutral attribution instead of failing the
    // whole query.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return DELETED_USER_SENTINEL.profile as unknown as IProfile;
    }
    return loader.load(user.id);
  }

  @ResolveField('actor', () => IActor, {
    nullable: false,
    description: 'The Actor representing this User.',
  })
  async agent(
    @Parent() user: User,
    @Loader(ActorLoaderCreator, { parentClassRef: User })
    loader: ILoader<IActor>
  ): Promise<IActor> {
    // Same short-circuit as `profile` above: the sentinel is itself
    // already shaped like the lightweight `Actor` type it stands in for.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return DELETED_USER_SENTINEL as unknown as IActor;
    }
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
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return DELETED_USER_SENTINEL_AUTHORIZATION;
    }
    return loader.load(user.id);
  }

  @ResolveField('email', () => String, {
    nullable: false,
    description: 'The email address for this User.',
  })
  async email(
    @Parent() user: User,
    @CurrentActor() actorContext: ActorContext
  ): Promise<string | 'not accessible'> {
    // The sentinel's id is never a real `user` row, so `isAccessGranted`'s
    // fallback reload (`getUserByIdOrFail`) would throw. PII is never
    // accessible for a departed user regardless of the caller's privileges.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return 'not accessible';
    }
    if (
      await this.isAccessGranted(
        user,
        actorContext,
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
    @CurrentActor() actorContext: ActorContext
  ): Promise<string | null | 'not accessible'> {
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return 'not accessible';
    }
    if (
      await this.isAccessGranted(
        user,
        actorContext,
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
    @CurrentActor() actorContext: ActorContext
  ): Promise<IAccount | undefined> {
    // A departed user hosts no account any more; short-circuit before
    // `isAccessGranted`'s fallback reload throws on the sentinel's
    // nonexistent id.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return undefined;
    }
    const account = await this.userService.getAccount(user);
    return (await this.canSeeFullAccount(user, actorContext, account))
      ? account
      : undefined;
  }

  // The resources hosted by this User's account as the current viewer may see
  // them: PUBLIC Virtual Contributors and Innovation Packs to every registered
  // viewer, ACCOUNT and HIDDEN ones only to the user and to the viewers who
  // can see the account itself, and every Innovation Hub. Null for anonymous
  // viewers. Intended for single-profile reads only.
  @ResolveField('hostedResources', () => IAccountHostedResources, {
    nullable: true,
    description:
      'Viewer-scoped hosted resources, null if anonymous. Single-profile use.',
  })
  async hostedResources(
    @Parent() user: User,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IAccountHostedResources | null> {
    // No privilege decorator on purpose: every registered viewer must get an
    // answer, scoped to what they may see. The enforcement point is the
    // domain filter in AccountLookupService, driven by the scope computed
    // here; anonymous viewers and the deleted-user sentinel get nothing.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return null;
    }
    if (!actorContext.actorID || actorContext.isAnonymous) {
      return null;
    }
    const account = await this.userService.getAccount(user);
    const scope: HostedResourcesViewerScope = (await this.canSeeFullAccount(
      user,
      actorContext,
      account
    ))
      ? 'FULL'
      : 'REGISTERED';
    return this.accountLookupService.getHostedResourcesForViewer(
      account.id,
      scope
    );
  }

  /**
   * Whether the actor may see this user's account itself: the user, holders
   * of READ_USER_PII on the user, or a platform role holding its own
   * privilege on the account (see `accountOpenToPlatformRole`).
   */
  private async canSeeFullAccount(
    user: User,
    actorContext: ActorContext,
    account: IAccount
  ): Promise<boolean> {
    return (
      user.id === actorContext.actorID || // user can see their own account
      (await this.isAccessGranted(
        user,
        actorContext,
        AuthorizationPrivilege.READ_USER_PII
      )) ||
      this.accountOpenToPlatformRole(actorContext, account)
    );
  }

  // The Platform License Manager assigns plans to accounts but holds no
  // READ_USER_PII, and the Resource Admin accepts account-transfer targets
  // but holds no READ_USER_PII either — the account field, the only place
  // the console learns the account id, was closed to both. Open the account
  // when the actor holds ACCOUNT_LICENSE_MANAGE or TRANSFER_RESOURCE_ACCEPT
  // on the account's OWN policy: each role's real privilege on the real
  // resource. No PII crosses here; the email/phone fields keep their own
  // gate. READ is deliberately excluded: accounts grant READ to anonymous
  // and registered users, so checking it here would expose every account id
  // to anyone.
  private accountOpenToPlatformRole(
    actorContext: ActorContext,
    account: IAccount
  ): boolean {
    return (
      !!account.authorization &&
      [
        AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
        AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
      ].some(privilege =>
        this.authorizationService.isAccessGranted(
          actorContext,
          account.authorization!,
          privilege
        )
      )
    );
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
    // Not short-circuited for the sentinel: `READ_USER_SETTINGS` is
    // self-only, so a real caller can never legitimately reach this field
    // for a departed user's `triggeredBy` in the first place (denied by
    // the loader's own privilege check, same as any other user's
    // settings) — there is no neutral "former member" settings payload to
    // fabricate in place of one, unlike `profile`/`authorization`/`actor`.
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
    // A departed user cannot be messaged.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return false;
    }
    const userSettings = await loader.load(user.id);

    return userSettings.communication.allowOtherUsersToSendMessages;
  }

  @ResolveField('isContactableViaEmail', () => Boolean, {
    nullable: false,
    description:
      'Whether this User can be offered an email contact route (they enabled email contact). Exposes only the consent flag, never the email address.',
  })
  async isContactableViaEmail(
    @Parent() user: User,
    @Loader(UserSettingsLoaderCreator, {
      parentClassRef: User,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IUserSettings>
  ): Promise<boolean> {
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return false;
    }
    const userSettings = await loader.load(user.id);

    return userSettings.communication.allowOtherUsersToContactViaEmail;
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
    // A departed user has no storage aggregator any more; short-circuit
    // before the loader's own `checkParentPrivilege` reload has a chance
    // to look up the nonexistent `user` row.
    if (user.id === DELETED_USER_SENTINEL_ID) {
      return undefined as unknown as IStorageAggregator;
    }
    return loader.load(user.id);
  }

  @ResolveField('authentication', () => UserAuthenticationResult, {
    nullable: true,
    description: 'Details about the authentication used for this User.',
  })
  async authentication(
    @Parent() user: IUser,
    @CurrentActor() actorContext: ActorContext
  ): Promise<UserAuthenticationResult> {
    const isCurrentActor = user.id === actorContext.actorID;
    const platformAccessGranted = this.authorizationService.isAccessGranted(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN
    );
    const result: UserAuthenticationResult = {
      methods: [AuthenticationType.UNKNOWN],
      createdAt: undefined,
      authenticatedAt: undefined,
    };
    if (isCurrentActor || platformAccessGranted) {
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

  private async isAccessGranted(
    user: IUser,
    actorContext: ActorContext,
    privilege: AuthorizationPrivilege
  ): Promise<boolean> {
    // Use the already-loaded authorization when available (eager actor relation).
    // Only reload when the entity came from a path that skipped eager loading
    // (e.g. QueryBuilder-based pagination).
    let authorization = user.authorization;
    if (!authorization) {
      const loaded = await this.userService.getUserByIdOrFail(user.id);
      authorization = loaded.authorization;
    }
    const accessGranted = this.authorizationService.isAccessGranted(
      actorContext,
      authorization,
      privilege
    );
    // 027-platform-role-redesign (T076/T077): the race-condition diagnostic
    // that used to log here keyed on `global-community-read` / `global-support`
    // — both retired with the legacy vocabulary, so the branch could never fire
    // again. Removed rather than re-pointed at a target role: it was a
    // deliberately temporary probe for alkem-io/notifications#283, not a
    // capability, and re-aiming it would assert the race still involves
    // whichever role it was re-aimed at.
    return accessGranted;
  }
}
