import { ActorType, LogContext, ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  AccountDeletionBlockedException,
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
  UserAlreadyRegisteredException,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { validateEmail } from '@common/utils';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import {
  OidcSessionRevocationService,
  redactError,
  redactStack,
} from '@core/auth/oidc/revocation/oidc-session-revocation.service';
import { KratosSessionData } from '@core/authentication/kratos.session';
import { applyUserFilter } from '@core/filtering/filters';
import { UserFilterInput } from '@core/filtering/input-types';
import { PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { actorDefaults } from '@domain/actor/actor/actor.defaults';
import { ActorService } from '@domain/actor/actor/actor.service';
import { getActorDisplayName } from '@domain/actor/actor.display.name';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import {
  CreateUserInput,
  DeleteUserInput,
  UpdateUserInput,
} from '@domain/community/user';
import {
  AccountDeletionBlockerService,
  AccountDeletionInitiatorBranch,
} from '@domain/community/user/account-deletion/account.deletion.blocker.service';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { getReadOnlyDefaultCapabilityToggles } from '@services/mcp-server/capabilities/assistant.capability.classification';
import { InstrumentService } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityManager,
  FindOneOptions,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { RoleSetRoleSelectionCredentials } from '../../access/role-set/dto/role.set.dto.role.selection.credentials';
import { RoleSetRoleWithParentCredentials } from '../../access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { CreateUserSettingsInput } from '../user-settings/dto/user.settings.dto.create';
import { UpdateUserSettingsEntityInput } from '../user-settings/dto/user.settings.dto.update';
import { DESIGN_VERSION_CURRENT_DEFAULT } from '../user-settings/user.settings.design.version.constants';
import { UserSettingsService } from '../user-settings/user.settings.service';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UsersQueryArgs } from './dto/users.query.args';
import { User } from './user.entity';
import { IUser } from './user.interface';

/**
 * Outcomes of `UserService.revokeUserSessionsAndIdentity`'s two post-commit
 * legs, so a caller can record each distinctly rather than only knowing
 * that "something" failed.
 */
export interface UserPostDeletionLegOutcomes {
  /** False if EITHER the OIDC session revocation or the Kratos SSO session
   * invalidation call failed. Both share one outcome value on the audit
   * trail (`session_revocation_completed` / the existing
   * `session_invalidation_failed`). */
  sessionRevocationSucceeded: boolean;
  /** True iff Kratos identity deletion was attempted (gated on
   * `deleteData.deleteIdentity`). */
  identityDeletionAttempted: boolean;
  /** Meaningful only when `identityDeletionAttempted` is true. */
  identityDeletionSucceeded: boolean;
}

@InstrumentService()
@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    private communicationAdapter: CommunicationAdapter,
    private namingService: NamingService,
    private actorContextCacheService: ActorContextCacheService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private accountLookupService: AccountLookupService,
    private accountDeletionBlockerService: AccountDeletionBlockerService,
    private userLookupService: UserLookupService,
    private actorLookupService: ActorLookupService,
    private actorService: ActorService,
    private accountHostService: AccountHostService,
    private userSettingsService: UserSettingsService,
    private profileAvatarService: ProfileAvatarService,
    private kratosService: KratosService,
    // server#6315 — reached via OidcCoreModule, NOT OidcModule: importing the
    // latter from UserModule would be a dependency cycle.
    private readonly oidcSessionRevocationService: OidcSessionRevocationService,
    private readonly messagingService: MessagingService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private async invalidateActorContextCache(user: IUser): Promise<void> {
    await this.actorContextCacheService.deleteByActorID(user.id);
  }

  async createUser(
    userData: CreateUserInput,
    kratosData?: KratosSessionData
  ): Promise<IUser> {
    // Track whether the caller supplied an explicit nameID. When they did, a
    // unique-constraint collision must surface — we must not silently substitute
    // a different nameID. Auto-retry only applies to server-generated nameIDs.
    const nameIDWasGenerated = !userData.nameID;
    if (userData.nameID) {
      userData.nameID = userData.nameID.toLowerCase();
      await this.isUserNameIdAvailableOrFail(userData.nameID);
    } else {
      userData.nameID = await this.createUserNameID(userData);
    }

    await this.validateUserProfileCreationRequest(userData);

    const profileData = await this.extendProfileDataWithReferences(
      userData.profileData
    );
    // Note: Conversations now belong to the single platform Messaging.
    // User conversations are tracked via the conversation_membership pivot table.

    const authenticationID = kratosData?.authenticationID;
    if (authenticationID) {
      const existingUser =
        await this.userLookupService.getUserByAuthenticationID(
          authenticationID
        );
      if (existingUser) {
        throw new UserAlreadyRegisteredException(
          'Kratos identity already linked to another user'
        );
      }
    }

    this.logger.verbose?.(
      `Creating a new user with email: ${userData.email}`,
      LogContext.COMMUNITY
    );

    // Single transaction: all DB writes (StorageAggregator, Account, Actor,
    // Settings, User) are atomic — no orphans if any step fails. A duplicate
    // nameID hitting UQ_actor_nameID_user (rare race past the reservation read)
    // rolls back cleanly and we retry with a freshly generated nameID.
    let user: IUser | undefined;
    const maxNameIDAttempts = 3;
    for (let attempt = 1; attempt <= maxNameIDAttempts; attempt++) {
      try {
        user = await this.userRepository.manager.transaction(async mgr => {
          // nameID is inherited from Actor (CTI), not a @Column on User,
          // so TypeORM's create() won't copy it from the input — set it explicitly.
          const created: IUser = User.create({ ...userData });
          created.nameID = userData.nameID!;
          created.authorization = new AuthorizationPolicy(
            AuthorizationPolicyType.USER
          );
          created.settings = this.userSettingsService.createUserSettings(
            this.getDefaultUserSettings()
          );
          if (!created.serviceProfile) {
            created.serviceProfile = false;
          }
          if (authenticationID) {
            created.authenticationID = authenticationID;
          }

          created.storageAggregator =
            await this.storageAggregatorService.createStorageAggregator(
              StorageAggregatorType.USER,
              undefined,
              mgr
            );

          created.profile = await this.profileService.createProfile(
            profileData,
            ProfileType.USER,
            created.storageAggregator
          );

          await this.profileService.addOrUpdateTagsetOnProfile(
            created.profile,
            { name: TagsetReservedName.SKILLS, tags: [] }
          );
          await this.profileService.addOrUpdateTagsetOnProfile(
            created.profile,
            { name: TagsetReservedName.KEYWORDS, tags: [] }
          );
          await this.profileAvatarService.addAvatarVisualToProfile(
            created.profile,
            userData.profileData,
            kratosData,
            userData.firstName,
            userData.lastName
          );

          const account = await this.accountHostService.createAccount(
            AccountType.USER,
            mgr
          );
          created.accountID = account.id;

          // CTI handles multi-table saves automatically — no need to save actor separately.
          created.settings = await mgr.save(created.settings);
          return await mgr.save(created as User);
        });
        break;
      } catch (err) {
        if (
          nameIDWasGenerated &&
          attempt < maxNameIDAttempts &&
          isUserNameIdUniqueViolation(err)
        ) {
          const previous = userData.nameID;
          userData.nameID = await this.createUserNameID(userData);
          this.logger.warn?.(
            `createUser: nameID '${previous}' collided with UQ_actor_nameID_user; retrying with '${userData.nameID}' (attempt ${attempt + 1}/${maxNameIDAttempts})`,
            LogContext.COMMUNITY
          );
          continue;
        }
        throw err;
      }
    }
    if (!user) {
      throw new Error(
        'createUser: user creation completed without a result (unreachable)'
      );
    }

    await this.profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket(
      user.profile.id,
      user.id
    );
    // Reload to ensure have the updated avatar URL
    user = await this.getUserByIdOrFail(user.id);

    // Sync the user to the communication adapter
    // User.id (which is Actor.id) is used as the AlkemioActorID for all communication operations
    const displayName = getActorDisplayName(user);

    try {
      await this.communicationAdapter.syncActor(user.id, displayName);
      this.logger.verbose?.(
        `Synced user actor to communication adapter: ${user.id}`,
        LogContext.COMMUNITY
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to sync user actor to communication adapter: ${user.id}`,
        e?.stack,
        LogContext.COMMUNITY
      );
      // Don't throw - user creation should succeed even if sync fails
    }

    // Create a guidance conversation with the well-known chat guidance VC
    await this.createGuidanceConversation(user.id);

    return user;
  }

  private async createGuidanceConversation(userID: string): Promise<void> {
    try {
      await this.messagingService.createConversationWithWellKnownVC(
        userID, // user.id = actorID in the new model
        VirtualContributorWellKnown.CHAT_GUIDANCE
      );

      this.logger.verbose?.(
        `Created guidance conversation for user: ${userID}`,
        LogContext.COMMUNITY
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create guidance conversation for user ${userID}: ${error}`,
        error?.stack,
        LogContext.COMMUNITY
      );
      // Don't throw - user creation should succeed even if conversation creation fails
    }
  }

  private getDefaultUserSettings(): CreateUserSettingsInput {
    const settings: CreateUserSettingsInput = {
      communication: {
        allowOtherUsersToSendMessages: true,
        allowOtherUsersToContactViaEmail: false,
      },
      privacy: {
        // Note: not currently used but will be near term.
        contributionRolesPubliclyVisible: true,
      },
      notification: {
        organization: {
          adminMessageReceived: { email: true, inApp: true, push: true },
          adminMentioned: { email: true, inApp: true, push: true },
        },
        platform: {
          forumDiscussionCreated: { email: true, inApp: false, push: false },
          forumDiscussionComment: { email: true, inApp: true, push: true },
          admin: {
            userProfileCreated: { email: false, inApp: false, push: false },
            userProfileRemoved: { email: false, inApp: false, push: false },
            spaceCreated: { email: false, inApp: false, push: false },
            userGlobalRoleChanged: { email: false, inApp: false, push: false },
            userEmailChanged: { email: true, inApp: false, push: false },
          },
        },
        space: {
          admin: {
            communityApplicationReceived: {
              email: true,
              inApp: true,
              push: true,
            },
            communityNewMember: { email: true, inApp: true, push: true },
            communicationMessageReceived: {
              email: true,
              inApp: true,
              push: true,
            },
            collaborationCalloutContributionCreated: {
              email: false,
              inApp: true,
              push: true,
            },
            userEmailChanged: { email: true, inApp: false, push: false },
          },
          communicationUpdates: { email: true, inApp: true, push: true },
          collaborationCalloutContributionCreated: {
            email: false,
            inApp: true,
            push: true,
          },
          collaborationCalloutPostContributionComment: {
            email: false,
            inApp: true,
            push: true,
          },
          collaborationCalloutComment: {
            email: false,
            inApp: true,
            push: true,
          },
          collaborationCalloutPublished: {
            email: true,
            inApp: true,
            push: true,
          },
          communityCalendarEvents: { email: true, inApp: true, push: true },
          collaborationPollVoteCastOnOwnPoll: {
            email: false,
            inApp: true,
            push: false,
          },
          collaborationPollVoteCastOnPollIVotedOn: {
            email: false,
            inApp: true,
            push: false,
          },
          collaborationPollModifiedOnPollIVotedOn: {
            email: false,
            inApp: true,
            push: false,
          },
          collaborationPollVoteAffectedByOptionChange: {
            email: false,
            inApp: true,
            push: false,
          },
          collaborationCalloutReaction: {
            email: false,
            inApp: true,
            push: true,
          },
        },
        user: {
          mentioned: { email: true, inApp: true, push: true },
          commentReply: { email: false, inApp: true, push: true },
          messageReceived: { email: true, inApp: true, push: true },
          // 034-messaging-notifications (FR-002): email OFF, inApp OFF
          // (permanently unsupported — enforced platform-wide regardless of
          // this stored value, FR-003/D-2), push ON.
          conversationMessageDirect: {
            email: false,
            inApp: false,
            push: true,
          },
          conversationMessageGroup: {
            email: false,
            inApp: false,
            push: true,
          },
          membership: {
            spaceCommunityInvitationReceived: {
              email: true,
              inApp: true,
              push: true,
            },
            spaceCommunityJoined: { email: true, inApp: true, push: true },
          },
        },
        virtualContributor: {
          adminSpaceCommunityInvitation: {
            email: true,
            inApp: true,
            push: true,
          },
        },
        sound: {
          chatMessage: true,
          inAppNotification: true,
        },
      },
      homeSpace: {
        spaceID: null,
        autoRedirect: false,
      },
      // Read-only assistant authority by default (FR-018): all READ capabilities
      // enabled, all WRITE_* disabled, derived from the shared frozen
      // classification (contracts/assistant-authority.md §1/§2). A new WRITE
      // capability defaults disabled for existing users (absence = disabled).
      assistant: {
        enabledCapabilities: getReadOnlyDefaultCapabilityToggles(),
      },
      designVersion: DESIGN_VERSION_CURRENT_DEFAULT,
      language: null,
      languageOfferAnswered: false,
    };
    return settings;
  }

  public async updateUserSettings(
    user: IUser,
    settingsData: UpdateUserSettingsEntityInput
  ): Promise<IUser> {
    user.settings = this.userSettingsService.updateSettings(
      user.settings,
      settingsData
    );

    return await this.save(user);
  }

  private async extendProfileDataWithReferences(
    profileData?: CreateProfileInput
  ): Promise<CreateProfileInput> {
    // ensure the result + references are there
    let result = profileData;
    if (!result) {
      result = {
        referencesData: [],
        displayName: '',
      };
    }
    if (!result.referencesData) {
      result.referencesData = [];
    }
    // Get the template to populate with
    const referenceTemplates = actorDefaults.references;
    if (referenceTemplates) {
      for (const referenceTemplate of referenceTemplates) {
        const existingRef = result.referencesData?.find(
          reference =>
            reference.name.toLowerCase() ===
            referenceTemplate.name.toLowerCase()
        );
        if (!existingRef) {
          const newRefData = {
            name: referenceTemplate.name,
            uri: referenceTemplate.uri,
            description: referenceTemplate.description,
          };
          result.referencesData?.push(newRefData);
        }
      }
    }

    return result;
  }

  async clearAuthenticationIDForUser(user: IUser): Promise<IUser> {
    if (!user.authenticationID) {
      return user;
    }

    user.authenticationID = null;
    const updatedUser = await this.save(user);
    // Invalidate cache by actorID
    await this.actorContextCacheService.deleteByActorID(user.id);
    this.logger.verbose?.(
      `Cleared authentication ID for user ${updatedUser.id}`,
      LogContext.AUTH
    );
    return updatedUser;
  }

  async clearAuthenticationIDById(userId: string): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userId);
    return this.clearAuthenticationIDForUser(user);
  }

  private async validateUserProfileCreationRequest(
    userData: CreateUserInput
  ): Promise<boolean> {
    const userCheck = await this.userLookupService.isRegisteredUser(
      userData.email
    );
    if (userCheck)
      throw new ValidationException(
        `User profile with the specified email (${userData.email}) already exists`,
        LogContext.COMMUNITY
      );
    // Normalize email: trim whitespace and lowercase for case-insensitive matching
    userData.email = userData.email.trim().toLowerCase();
    return true;
  }

  private async isUserNameIdAvailableOrFail(nameID: string) {
    const userCount = await this.userRepository.count({
      where: { nameID: nameID },
    });
    if (userCount != 0)
      throw new ValidationException(
        `The provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  /**
   * Loads the user with its child entities, validates them, refuses when
   * the account still holds a resource, and invalidates the actor-context
   * cache — the preamble shared by every deletion entry point (`deleteUser`
   * and the transactional `deleteUserDbOnly`).
   */
  /**
   * Loads the user with its child entities, validates them, and invalidates
   * the actor-context cache — the load/validate preamble shared by every
   * deletion entry point. Deliberately does NOT check for blocking
   * resources: each caller applies its own predicate (`deleteUser` the
   * original boolean check; `deleteUserDbOnly` the itemized,
   * initiator-branch-aware one), because they throw different exception
   * shapes and — on the self branch — check a wider blocker set.
   */
  private async loadUserForDeletion(userID: string): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userID, {
      relations: {
        profile: true,
        storageAggregator: true,
        settings: true,
      },
    });

    if (
      !user.profile ||
      !user.storageAggregator ||
      !user.authorization ||
      !user.settings
    ) {
      throw new RelationshipNotFoundException(
        `User entity missing required child entities when deleting: ${userID}`,
        LogContext.COMMUNITY
      );
    }

    await this.invalidateActorContextCache(user);

    return user;
  }

  private async loadAndValidateUserForDeletion(userID: string): Promise<IUser> {
    const user = await this.loadUserForDeletion(userID);

    const accountHasResources =
      await this.accountLookupService.areResourcesInAccount(user.accountID);
    if (accountHasResources) {
      throw new ForbiddenException(
        'Unable to delete User: account contains one or more resources',
        LogContext.SPACES
      );
    }

    return user;
  }

  /**
   * DB-only deletion mode for the account-deletion saga: every primary-store
   * write joins the caller's transactional EntityManager, and stored-file
   * bytes are never deleted inline (their external ids are collected and
   * returned so the caller can delete the actual bytes after commit). The
   * post-commit external legs (session revocation, Kratos identity) are
   * deliberately NOT run here — see `revokeUserSessionsAndIdentity` — since
   * they must run once, after the OUTER transaction (which also deletes the
   * account) has committed, not after this user-only slice of it.
   */
  async deleteUserDbOnly(
    deleteData: DeleteUserInput,
    em: EntityManager,
    branch: AccountDeletionInitiatorBranch
  ): Promise<{ user: IUser; documentIDs: string[] }> {
    const userID = deleteData.ID;
    const user = await this.loadUserForDeletion(userID);

    // FR-006: the same predicate that answers the pre-flight read also
    // authoritatively refuses the mutation, so the two can never drift. The
    // exception shape differs by branch: the self branch gets the distinct,
    // client-recognizable ACCOUNT_DELETION_BLOCKED code (so the client
    // re-runs the pre-flight and renders the itemized dialog); the admin
    // branch keeps the pre-existing ForbiddenException, unchanged.
    const blockers = await this.accountDeletionBlockerService.getBlockers(
      userID,
      user.accountID,
      branch
    );
    if (!blockers.canDelete) {
      if (branch === 'self') {
        throw new AccountDeletionBlockedException(
          'Unable to delete User: account is blocked from deletion',
          LogContext.SPACES,
          { blockers: blockers.blockers.map(b => b.kind) }
        );
      }
      throw new ForbiddenException(
        'Unable to delete User: account contains one or more resources',
        LogContext.SPACES
      );
    }

    const { id } = user;

    const profileResult =
      await this.profileService.deleteProfileForAccountDeletion(
        user.profile.id,
        em
      );

    // Note: Credentials are on Actor (which User extends), will be deleted via cascade
    await this.authorizationPolicyService.delete(user.authorization!, em);

    const aggregatorResult =
      await this.storageAggregatorService.deleteForAccountDeletion(
        user.storageAggregator!.id,
        em
      );

    await this.userSettingsService.deleteUserSettings(user.settings!.id, em);

    // Delete actor — cascades to delete the user row via FK (user.id → actor.id ON DELETE CASCADE).
    // Also cascades to delete credentials (credential.actorID → actor.id ON DELETE CASCADE).
    await this.actorService.deleteActorById(id, em);

    user.id = id;
    return {
      user,
      documentIDs: [
        ...profileResult.documentIDs,
        ...aggregatorResult.documentIDs,
      ],
    };
  }

  /**
   * The post-commit external legs previously inlined at the tail of
   * `deleteUser` (server#6315), extracted so the account-deletion saga can
   * call them once, after its own outer transaction commits, and record
   * their outcomes. Behavior is unchanged: revocation is unconditional and
   * best-effort; Kratos identity deletion is gated on
   * `deleteData.deleteIdentity`.
   */
  async revokeUserSessionsAndIdentity(
    user: IUser,
    deleteData: DeleteUserInput
  ): Promise<UserPostDeletionLegOutcomes> {
    const id = user.id;
    const outcomes: UserPostDeletionLegOutcomes = {
      sessionRevocationSucceeded: true,
      identityDeletionAttempted: false,
      identityDeletionSucceeded: false,
    };

    if (!user.authenticationID) {
      return outcomes;
    }

    try {
      await this.oidcSessionRevocationService.revokeAllForSub(
        user.authenticationID,
        'account_deleted'
      );
    } catch (error: any) {
      outcomes.sessionRevocationSucceeded = false;
      this.logger.error?.(
        {
          message:
            'Failed to revoke OIDC sessions during user deletion; the deletion still stands',
          userID: id,
          authenticationID: user.authenticationID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.AUTH
      );
    }

    try {
      await this.kratosService.invalidateAllIdentitySessions(
        user.authenticationID
      );
    } catch (error: any) {
      outcomes.sessionRevocationSucceeded = false;
      this.logger.error?.(
        {
          message:
            'Failed to invalidate Kratos identity sessions during user deletion; the deletion still stands',
          userID: id,
          authenticationID: user.authenticationID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.AUTH
      );
    }

    try {
      await this.kratosService.clearIdentityActorMetadata(
        user.authenticationID
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Failed to clear actor metadata from Kratos identity',
          userID: id,
          authenticationID: user.authenticationID,
          error: redactError(error),
        },
        redactStack(error),
        LogContext.AUTH
      );
    }

    if (deleteData.deleteIdentity) {
      outcomes.identityDeletionAttempted = true;
      try {
        await this.kratosService.deleteIdentityById(user.authenticationID);
        outcomes.identityDeletionSucceeded = true;
      } catch (error: any) {
        this.logger.error?.(
          {
            message: 'Failed to delete Kratos identity during user deletion',
            userID: id,
            authenticationID: user.authenticationID,
            error: redactError(error),
          },
          redactStack(error),
          LogContext.AUTH
        );
      }
    }

    return outcomes;
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.loadAndValidateUserForDeletion(userID);
    const { id } = user;

    // All DB deletions in a single transaction so a partial failure
    // does not leave the user in an inconsistent state.
    await this.userRepository.manager.transaction(async () => {
      await this.profileService.deleteProfile(user.profile.id);

      // Note: Credentials are on Actor (which User extends), will be deleted via cascade
      await this.authorizationPolicyService.delete(user.authorization!);

      await this.storageAggregatorService.delete(user.storageAggregator!.id);

      await this.userSettingsService.deleteUserSettings(user.settings!.id);

      // Delete actor — cascades to delete the user row via FK (user.id → actor.id ON DELETE CASCADE).
      // Also cascades to delete credentials (credential.actorID → actor.id ON DELETE CASCADE).
      await this.actorService.deleteActorById(id);
    });

    // Note: Conversations belong to the platform Messaging.
    // User's conversation memberships are cleaned up via cascade.

    // server#6315 — session revocation cascade, extracted to
    // `revokeUserSessionsAndIdentity` so the account-deletion saga can run
    // it once after ITS OWN outer transaction commits. Same properties as
    // before: after the commit (the transaction closed above), unconditional
    // session revocation, best-effort, Kratos identity deletion gated on
    // `deleteData.deleteIdentity`.
    await this.revokeUserSessionsAndIdentity(user, deleteData);

    // Restore id so callers get the deleted entity's id
    user.id = id;
    return user;
  }

  public async getAccount(user: IUser): Promise<IAccount> {
    return await this.accountLookupService.getAccountOrFail(user.accountID);
  }

  async getUserByIdOrFail(
    userID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | never> {
    if (userID === '') {
      throw new EntityNotFoundException(
        `No userID provided: ${userID}`,
        LogContext.COMMUNITY
      );
    }
    const user = await this.userLookupService.getUserById(userID, options);

    if (!user) {
      throw new EntityNotFoundException(
        `Unable to find user with given ID: ${userID}`,
        LogContext.COMMUNITY
      );
    }

    return user;
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | never | null> {
    if (!validateEmail(email)) {
      throw new FormatNotSupportedException(
        `Incorrect format of the user email: ${email}`,
        LogContext.COMMUNITY
      );
    }

    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      ...options,
    });
  }

  async save(user: IUser): Promise<IUser> {
    return await this.userRepository.save(user);
  }

  async getUsersForQuery(args: UsersQueryArgs): Promise<IUser[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;

    this.logger.verbose?.(
      `Querying all users with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );
    const credentialsFilter = args.filter?.credentials;
    let users: User[] = [];
    if (credentialsFilter) {
      // User extends Actor which has the credentials relationship directly
      users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.credentials', 'credential')
        .where('credential.type IN (:...credentialsFilter)')
        .setParameters({
          credentialsFilter: credentialsFilter,
        })
        .getMany();
    } else {
      users = await this.userRepository.findBy({ serviceProfile: false });
    }

    if (args.IDs) {
      users = users.filter(user => args.IDs?.includes(user.id));
    }

    return limitAndShuffle(users, limit, shuffle);
  }

  async getPaginatedUsers(
    paginationArgs: PaginationArgs,
    withTags?: boolean,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const qb = this.userRepository.createQueryBuilder('user');

    if (withTags !== undefined) {
      qb.leftJoin('user.profile', 'profile')
        .leftJoin('tagset', 'tagset', 'profile.id = tagset.profileId')
        // cannot use object or operators here
        // because typeorm cannot construct the query properly
        .where(`tagset.tags ${withTags ? '!=' : '='} ''`);
    }

    if (filter) {
      applyUserFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  public async getPaginatedAvailableEntryRoleUsers(
    entryRoleCredentials: RoleSetRoleWithParentCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentEntryRoleUserIds =
      await this.actorLookupService.getActorIDsWithCredential(
        entryRoleCredentials.role,
        [ActorType.USER]
      );
    const qb = this.userRepository.createQueryBuilder('user').select();

    if (entryRoleCredentials.parentRoleSetRole) {
      qb.leftJoin('user.credentials', 'credential')
        .addSelect(['credential.type', 'credential.resourceID'])
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: entryRoleCredentials.parentRoleSetRole.type,
          resourceID: entryRoleCredentials.parentRoleSetRole.resourceID,
        });
    }

    if (currentEntryRoleUserIds.length > 0) {
      const hasWhere =
        qb.expressionMap.wheres && qb.expressionMap.wheres.length > 0;

      qb[hasWhere ? 'andWhere' : 'where'](
        'NOT user.id IN (:...memberUsers)'
      ).setParameters({
        memberUsers: currentEntryRoleUserIds,
      });
    }

    if (filter) {
      applyUserFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  public async getPaginatedAvailableElevatedRoleUsers(
    roleSetCredentials: RoleSetRoleSelectionCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentElevatedRoleUserIds =
      await this.actorLookupService.getActorIDsWithCredential(
        roleSetCredentials.elevatedRole,
        [ActorType.USER]
      );
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select()
      .leftJoin('user.credentials', 'credential')
      .addSelect(['credential.type', 'credential.resourceID'])
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: roleSetCredentials.entryRole.type,
        resourceID: roleSetCredentials.entryRole.resourceID,
      });

    if (currentElevatedRoleUserIds.length > 0) {
      qb.andWhere('NOT user.id IN (:...leadUsers)').setParameters({
        leadUsers: currentElevatedRoleUserIds,
      });
    }

    if (filter) {
      applyUserFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  async updateUser(userInput: UpdateUserInput): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userInput.ID, {
      relations: { profile: true },
    });

    if (userInput.nameID) {
      if (userInput.nameID.toLowerCase() !== user.nameID.toLowerCase()) {
        // new NameID, check for uniqueness
        await this.isUserNameIdAvailableOrFail(userInput.nameID);
        user.nameID = userInput.nameID;
      }
    }

    if (userInput.firstName !== undefined) {
      user.firstName = userInput.firstName;
    }
    if (userInput.lastName !== undefined) {
      user.lastName = userInput.lastName;
    }
    if (userInput.phone !== undefined) {
      user.phone = userInput.phone;
    }

    if (userInput.serviceProfile !== undefined) {
      user.serviceProfile = userInput.serviceProfile;
    }

    if (userInput.profileData) {
      user.profile = await this.profileService.updateProfile(
        user.profile,
        userInput.profileData
      );
    }

    const response = await this.save(user);
    await this.invalidateActorContextCache(response);
    return response;
  }

  public async updateUserPlatformSettings(
    updateData: UpdateUserPlatformSettingsInput
  ): Promise<IUser> {
    const user = await this.getUserByIdOrFail(updateData.userID);

    if (updateData.nameID) {
      if (updateData.nameID !== user.nameID) {
        // updating the nameID, check new value is allowed
        await this.isUserNameIdAvailableOrFail(updateData.nameID);

        user.nameID = updateData.nameID;
      }
    }

    if (updateData.email) {
      const normalizedEmail = updateData.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const userCheck =
          await this.userLookupService.isRegisteredUser(normalizedEmail);
        if (userCheck) {
          throw new ValidationException(
            `User profile with the specified email (${normalizedEmail}) already exists`,
            LogContext.COMMUNITY
          );
        }

        user.email = normalizedEmail;
      }
    }

    return await this.save(user);
  }

  async getProfile(user: IUser): Promise<IProfile> {
    const userWithProfile = await this.getUserByIdOrFail(user.id, {
      relations: { profile: true },
    });
    const profile = userWithProfile.profile;
    if (!profile)
      throw new RelationshipNotFoundException(
        `Unable to load Profile for User: ${user.id} `,
        LogContext.COMMUNITY
      );

    return profile;
  }

  async getStorageAggregatorOrFail(
    userID: string
  ): Promise<IStorageAggregator> {
    const userWithStorage = await this.getUserByIdOrFail(userID, {
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = userWithStorage.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storageAggregator for User with nameID: ${userWithStorage.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator;
  }

  private async createUserNameID(userData: CreateUserInput): Promise<string> {
    let base = '';
    if (userData.firstName && userData.lastName) {
      base = `${userData.firstName}-${userData.lastName}`;
    } else if (userData.firstName) {
      base = `${userData.firstName}`;
    } else if (userData.lastName) {
      base = `${userData.lastName}`;
    } else if (userData.profileData?.displayName) {
      base = userData.profileData.displayName;
    } else {
      base = userData.email.split('@')[0];
    }
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInUsers();
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }
}

// Postgres raises unique_violation (SQLSTATE 23505) on the partial index
// UQ_actor_nameID_user. TypeORM wraps it as QueryFailedError with the pg error
// exposed as driverError. Match on both code and constraint to avoid reacting
// to any other 23505 coming from the user-creation transaction.
function isUserNameIdUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driver = (err as QueryFailedError & { driverError?: unknown })
    .driverError as { code?: string; constraint?: string } | undefined;
  return (
    driver?.code === '23505' && driver?.constraint === 'UQ_actor_nameID_user'
  );
}
