import { AuthorizationCredential, LogContext, ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
  UserRegistrationInvalidEmail,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { validateEmail } from '@common/utils';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { applyUserFilter } from '@core/filtering/filters';
import { UserFilterInput } from '@core/filtering/input-types';
import { PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import {
  CreateUserInput,
  DeleteUserInput,
  UpdateUserInput,
} from '@domain/community/user';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { InstrumentService } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, and, inArray, desc, asc, gt, ilike, count, sql } from 'drizzle-orm';
import { users } from './user.schema';
import { RoleSetRoleSelectionCredentials } from '../../access/role-set/dto/role.set.dto.role.selection.credentials';
import { RoleSetRoleWithParentCredentials } from '../../access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { contributorDefaults } from '../contributor/contributor.defaults';
import { ContributorService } from '../contributor/contributor.service';
import { UserAuthenticationLinkService } from '../user-authentication-link/user.authentication.link.service';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { CreateUserSettingsInput } from '../user-settings/dto/user.settings.dto.create';
import { UpdateUserSettingsEntityInput } from '../user-settings/dto/user.settings.dto.update';
import { UserSettingsService } from '../user-settings/user.settings.service';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { UsersQueryArgs } from './dto/users.query.args';
import { User } from './user.entity';
import { IUser } from './user.interface';

@InstrumentService()
@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    private communicationAdapter: CommunicationAdapter,
    private namingService: NamingService,
    private agentService: AgentService,
    private agentInfoCacheService: AgentInfoCacheService,
    private readonly userAuthenticationLinkService: UserAuthenticationLinkService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private accountLookupService: AccountLookupService,
    private userLookupService: UserLookupService,
    private accountHostService: AccountHostService,
    private userSettingsService: UserSettingsService,
    private contributorService: ContributorService,
    private kratosService: KratosService,
    private readonly messagingService: MessagingService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private async invalidateAgentInfoCache(user: IUser): Promise<void> {
    if (user.authenticationID) {
      await this.agentInfoCacheService.deleteAgentInfoFromCache(
        user.authenticationID
      );
    }
  }

  async createUser(
    userData: CreateUserInput,
    agentInfo?: AgentInfo
  ): Promise<IUser> {
    if (userData.nameID) {
      // Convert nameID to lower case
      userData.nameID = userData.nameID.toLowerCase();
      await this.isUserNameIdAvailableOrFail(userData.nameID);
    } else {
      userData.nameID = await this.createUserNameID(userData);
    }

    await this.validateUserProfileCreationRequest(userData);

    let user: IUser = User.create({
      ...userData,
    });
    user.authorization = new AuthorizationPolicy(AuthorizationPolicyType.USER);
    user.settings = this.userSettingsService.createUserSettings(
      this.getDefaultUserSettings()
    );

    if (!user.serviceProfile) {
      user.serviceProfile = false;
    }

    const profileData = await this.extendProfileDataWithReferences(
      userData.profileData
    );
    user.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.USER
      );
    // Do not create the guidance room here, it will be created on demand

    user.profile = await this.profileService.createProfile(
      profileData,
      ProfileType.USER,
      user.storageAggregator
    );

    await this.profileService.addOrUpdateTagsetOnProfile(user.profile, {
      name: TagsetReservedName.SKILLS,
      tags: [],
    });
    await this.profileService.addOrUpdateTagsetOnProfile(user.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.contributorService.addAvatarVisualToContributorProfile(
      user.profile,
      userData.profileData,
      agentInfo,
      userData.firstName,
      userData.lastName
    );

    user.agent = await this.agentService.createAgent({
      type: AgentType.USER,
    });

    // Note: Conversations now belong to the single platform Messaging.
    // User conversations are tracked via the conversation_membership pivot table.

    const authenticationID = agentInfo?.authenticationID;
    if (authenticationID) {
      await this.userAuthenticationLinkService.ensureAuthenticationIdAvailable(
        authenticationID
      );
      user.authenticationID = authenticationID;
    }

    this.logger.verbose?.(
      `Created a new user with email: ${user.email}`,
      LogContext.COMMUNITY
    );

    const account = await this.accountHostService.createAccount(
      AccountType.USER
    );
    user.accountID = account.id;

    user = await this.save(user);

    await this.contributorService.ensureAvatarIsStoredInLocalStorageBucket(
      user.profile.id,
      user.id
    );
    // Reload to ensure have the updated avatar URL
    user = await this.getUserOrFail(user.id, {
      with: { agent: true },
    });

    // Sync the user's agent to the communication adapter
    // The agent.id is used as the AlkemioActorID for all communication operations
    const displayName =
      `${user.firstName} ${user.lastName}`.trim() || user.email;

    try {
      await this.communicationAdapter.syncActor(user.agent.id, displayName);
      this.logger.verbose?.(
        `Synced user actor to communication adapter: ${user.agent.id}`,
        LogContext.COMMUNITY
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to sync user actor to communication adapter: ${user.agent.id}`,
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
      // Get user's agent ID for the new internal API
      const user = await this.userLookupService.getUserOrFail(userID, {
        with: { agent: true },
      });
      const callerAgentId = user.agent.id;

      // wellKnownVirtualContributor will be resolved to agent ID by the service
      await this.messagingService.createConversation({
        callerAgentId,
        wellKnownVirtualContributor: VirtualContributorWellKnown.CHAT_GUIDANCE,
      });

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
      },
      privacy: {
        // Note: not currently used but will be near term.
        contributionRolesPubliclyVisible: true,
      },
      notification: {
        organization: {
          adminMessageReceived: { email: true, inApp: true },
          adminMentioned: { email: true, inApp: true },
        },
        platform: {
          forumDiscussionCreated: { email: true, inApp: false },
          forumDiscussionComment: { email: true, inApp: true },
          admin: {
            userProfileCreated: { email: false, inApp: false },
            userProfileRemoved: { email: false, inApp: false },
            spaceCreated: { email: false, inApp: false },
            userGlobalRoleChanged: { email: false, inApp: false },
          },
        },
        space: {
          admin: {
            communityApplicationReceived: { email: true, inApp: true },
            communityNewMember: { email: true, inApp: true },
            communicationMessageReceived: { email: true, inApp: true },
            collaborationCalloutContributionCreated: {
              email: false,
              inApp: true,
            },
          },
          communicationUpdates: { email: true, inApp: true },
          collaborationCalloutContributionCreated: {
            email: false,
            inApp: true,
          },
          collaborationCalloutPostContributionComment: {
            email: false,
            inApp: true,
          },
          collaborationCalloutComment: { email: false, inApp: true },
          collaborationCalloutPublished: { email: true, inApp: true },
          communityCalendarEvents: { email: true, inApp: true },
        },
        user: {
          mentioned: { email: true, inApp: true },
          commentReply: { email: false, inApp: true },
          messageReceived: { email: true, inApp: true },
          membership: {
            spaceCommunityInvitationReceived: { email: true, inApp: true },
            spaceCommunityJoined: { email: true, inApp: true },
          },
        },
        virtualContributor: {
          adminSpaceCommunityInvitation: { email: true, inApp: true },
        },
      },
      homeSpace: {
        spaceID: null,
        autoRedirect: false,
      },
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
    const referenceTemplates = contributorDefaults.references;
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

  async createOrLinkUserFromAgentInfo(
    agentInfo: AgentInfo
  ): Promise<{ user: IUser; isNew: boolean }> {
    // Extra check that there is valid data + no user with the email
    const email = agentInfo.email;
    if (!email || email.length === 0) {
      throw new UserRegistrationInvalidEmail(
        `Invalid email provided: ${email}`
      );
    }

    const resolvedUser =
      await this.userAuthenticationLinkService.resolveExistingUser(agentInfo, {
        conflictMode: 'error',
      });

    if (resolvedUser) {
      return { user: resolvedUser.user, isNew: false };
    }

    const userData: CreateUserInput = {
      email: email,
      firstName: agentInfo.firstName,
      lastName: agentInfo.lastName,
      profileData: {
        visuals: [
          {
            name: VisualType.AVATAR,
            uri: agentInfo.avatarURL,
          },
        ],
        displayName: `${agentInfo.firstName} ${agentInfo.lastName}`,
      },
    };

    const user = await this.createUser(userData, agentInfo);
    return { user, isNew: true };
  }

  async clearAuthenticationIDForUser(user: IUser): Promise<IUser> {
    if (!user.authenticationID) {
      return user;
    }

    const oldAuthId = user.authenticationID;
    user.authenticationID = null;
    const updatedUser = await this.save(user);
    // Invalidate cache using old authenticationID before it was cleared
    if (oldAuthId) {
      await this.agentInfoCacheService.deleteAgentInfoFromCache(oldAuthId);
    }
    this.logger.verbose?.(
      `Cleared authentication ID for user ${updatedUser.id}`,
      LogContext.AUTH
    );
    return updatedUser;
  }

  async clearAuthenticationIDById(userId: string): Promise<IUser> {
    const user = await this.getUserOrFail(userId);
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
    const result = await this.db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.nameID, nameID));
    const userCount = result.length;
    if (userCount != 0)
      throw new ValidationException(
        `The provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserOrFail(userID, {
      with: {
        profile: true,
        agent: true,
        storageAggregator: true,
        settings: true,
      },
    });

    if (
      !user.profile ||
      !user.storageAggregator ||
      !user.agent ||
      !user.authorization ||
      !user.settings
    ) {
      throw new RelationshipNotFoundException(
        `User entity missing required child entities when deleting: ${userID}`,
        LogContext.COMMUNITY
      );
    }

    // TODO: give additional feedback?
    const accountHasResources =
      await this.accountLookupService.areResourcesInAccount(user.accountID);
    if (accountHasResources) {
      throw new ForbiddenException(
        'Unable to delete User: account contains one or more resources',
        LogContext.SPACES
      );
    }
    const { id } = user;

    await this.invalidateAgentInfoCache(user);

    await this.profileService.deleteProfile(user.profile.id);

    await this.agentService.deleteAgent(user.agent.id);

    await this.authorizationPolicyService.delete(user.authorization);

    await this.storageAggregatorService.delete(user.storageAggregator.id);

    await this.userSettingsService.deleteUserSettings(user.settings.id);

    // Note: Conversations belong to the platform Messaging.
    // User's conversation memberships are cleaned up via cascade.
    // TODO: Consider deleting conversations where this user is the only member

    if (deleteData.deleteIdentity) {
      await this.kratosService.deleteIdentityByEmail(user.email);
    }

    await this.db.delete(users).where(eq(users.id, id));

    // Note: Should we unregister the user from communications?

    return {
      ...user,
      id,
    };
  }

  public async getAccount(user: IUser): Promise<IAccount> {
    return await this.accountLookupService.getAccountOrFail(user.accountID);
  }

  async getUserOrFail(
    userID: string,
    options?: { with?: Record<string, any> }
  ): Promise<IUser | never> {
    if (userID === '') {
      throw new EntityNotFoundException(
        `No userID provided: ${userID}`,
        LogContext.COMMUNITY
      );
    }
    const user = await this.userLookupService.getUserByUUID(userID, options);

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
    options?: { relations?: Record<string, any> }
  ): Promise<IUser | never | null> {
    if (!validateEmail(email)) {
      throw new FormatNotSupportedException(
        `Incorrect format of the user email: ${email}`,
        LogContext.COMMUNITY
      );
    }

    const result = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      with: options?.relations as any,
    });
    return result as unknown as IUser | null;
  }

  async save(user: IUser): Promise<IUser> {
    if (user.id) {
      // Update existing
      const [updated] = await this.db
        .update(users)
        .set(user as any)
        .where(eq(users.id, user.id))
        .returning();
      return updated as unknown as IUser;
    } else {
      // Insert new
      const [inserted] = await this.db
        .insert(users)
        .values(user as any)
        .returning();
      return inserted as unknown as IUser;
    }
  }

  async getUsersForQuery(args: UsersQueryArgs): Promise<IUser[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;

    this.logger.verbose?.(
      `Querying all users with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );
    const credentialsFilter = args.filter?.credentials;
    let userResults: IUser[] = [];
    if (credentialsFilter) {
      userResults = await this.db.query.users.findMany({
        with: {
          agent: {
            with: {
              credentials: true,
            },
          },
        },
      }) as unknown as IUser[];
      // Filter credentials in memory
      userResults = userResults.filter(user =>
        user.agent?.credentials?.some(c => credentialsFilter.includes(c.type as AuthorizationCredential))
      );
    } else {
      userResults = await this.db.query.users.findMany({
        where: eq(users.serviceProfile, false),
      }) as unknown as IUser[];
    }

    if (args.IDs) {
      userResults = userResults.filter(user => args.IDs?.includes(user.id));
    }

    return limitAndShuffle(userResults, limit, shuffle);
  }

  async getPaginatedUsers(
    paginationArgs: PaginationArgs,
    withTags?: boolean,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const filterConditions: ReturnType<typeof eq>[] = [];

    // Apply text filters
    if (filter?.firstName) {
      filterConditions.push(ilike(users.firstName, `%${filter.firstName}%`));
    }
    if (filter?.lastName) {
      filterConditions.push(ilike(users.lastName, `%${filter.lastName}%`));
    }
    if (filter?.email) {
      filterConditions.push(ilike(users.email, `%${filter.email}%`));
    }

    // Cursor-based pagination: find rowId of cursor item
    const cursorConditions = [...filterConditions];
    if (paginationArgs.after) {
      const cursorItem = await this.db.query.users.findFirst({
        where: eq(users.id, paginationArgs.after),
        columns: { rowId: true },
      });
      if (cursorItem?.rowId) {
        cursorConditions.push(gt(users.rowId, cursorItem.rowId));
      }
    }

    const limit = paginationArgs.first || 10;
    const filterWhere = filterConditions.length > 0 ? and(...filterConditions) : undefined;
    const cursorWhere = cursorConditions.length > 0 ? and(...cursorConditions) : undefined;

    // Fetch IDs with cursor + filter (SQL API avoids table aliasing issues)
    const idRows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(cursorWhere)
      .orderBy(asc(users.rowId))
      .limit(limit + 1);

    const hasNextPage = idRows.length > limit;
    if (hasNextPage) idRows.pop();

    // Batch-load full user objects with authorization
    let items: IUser[] = [];
    if (idRows.length > 0) {
      const userIds = idRows.map(r => r.id);
      const loaded = await this.db.query.users.findMany({
        where: inArray(users.id, userIds),
        with: { authorization: true },
      });
      // Preserve order from the ID query
      const byId = new Map(loaded.map(u => [u.id, u]));
      items = userIds
        .map(id => byId.get(id))
        .filter((u): u is NonNullable<typeof u> => !!u) as unknown as IUser[];
    }

    // Total count with filters only (no cursor)
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(users)
      .where(filterWhere);

    return {
      items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!paginationArgs.after,
        startCursor: items[0]?.id,
        endCursor: items[items.length - 1]?.id,
      },
      total,
    };
  }

  /**
   * UUID-cursor pagination for in-memory arrays.
   * Uses entity IDs as cursors instead of integer offsets.
   */
  private paginateInMemory<T extends { id: string }>(
    items: T[],
    paginationArgs: PaginationArgs
  ): IPaginatedType<T> {
    let startIndex = 0;
    if (paginationArgs.after) {
      const cursorIndex = items.findIndex(item => item.id === paginationArgs.after);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }
    const limit = paginationArgs.first || 10;
    const results = items.slice(startIndex, startIndex + limit);
    const hasNextPage = startIndex + limit < items.length;

    return {
      items: results,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: startIndex > 0,
        startCursor: results[0]?.id,
        endCursor: results[results.length - 1]?.id,
      },
      total: items.length,
    };
  }

  public async getPaginatedAvailableEntryRoleUsers(
    entryRoleCredentials: RoleSetRoleWithParentCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentEntryRoleUsers =
      await this.userLookupService.usersWithCredential(
        entryRoleCredentials.role
      );

    // Build conditions
    const conditions = [];

    if (entryRoleCredentials.parentRoleSetRole) {
      // Load users with specific credential - need to filter after loading with relations
      const usersWithCredentials = await this.db.query.users.findMany({
        with: {
          agent: {
            with: {
              credentials: true,
            },
          },
        },
      }) as unknown as IUser[];

      const filtered = usersWithCredentials.filter(user =>
        user.agent?.credentials?.some(
          c =>
            c.type === entryRoleCredentials.parentRoleSetRole?.type &&
            c.resourceID === entryRoleCredentials.parentRoleSetRole?.resourceID
        )
      );

      if (currentEntryRoleUsers.length > 0) {
        const memberUserIds = currentEntryRoleUsers.map(u => u.id);
        const available = filtered.filter(u => !memberUserIds.includes(u.id));
        return this.paginateInMemory(available, paginationArgs);
      }

      return this.paginateInMemory(filtered, paginationArgs);
    }

    // Fallback to all users excluding current members
    const allUsers = await this.db.query.users.findMany() as unknown as IUser[];
    const memberUserIds = currentEntryRoleUsers.map(u => u.id);
    const available = allUsers.filter(u => !memberUserIds.includes(u.id));

    return this.paginateInMemory(available, paginationArgs);
  }

  public async getPaginatedAvailableElevatedRoleUsers(
    roleSetCredentials: RoleSetRoleSelectionCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentElevatedRoleUsers =
      await this.userLookupService.usersWithCredential(
        roleSetCredentials.elevatedRole
      );

    // Load users with entry role credential
    const usersWithCredentials = await this.db.query.users.findMany({
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
    }) as unknown as IUser[];

    const filtered = usersWithCredentials.filter(user =>
      user.agent?.credentials?.some(
        c =>
          c.type === roleSetCredentials.entryRole.type &&
          c.resourceID === roleSetCredentials.entryRole.resourceID
      )
    );

    const leadUserIds = currentElevatedRoleUsers.map(u => u.id);
    const available = filtered.filter(u => !leadUserIds.includes(u.id));

    return this.paginateInMemory(available, paginationArgs);
  }

  async updateUser(userInput: UpdateUserInput): Promise<IUser> {
    const user = await this.getUserOrFail(userInput.ID, {
      with: { profile: true },
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
    await this.invalidateAgentInfoCache(response);
    return response;
  }

  public async updateUserPlatformSettings(
    updateData: UpdateUserPlatformSettingsInput
  ): Promise<IUser> {
    const user = await this.getUserOrFail(updateData.userID);

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
    const userWithProfile = await this.getUserOrFail(user.id, {
      with: { profile: true },
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
    const userWithStorage = await this.getUserOrFail(userID, {
      with: {
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
      await this.namingService.getReservedNameIDsInUsers(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }
}
