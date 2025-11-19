import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenException,
  RelationshipNotFoundException,
  UserRegistrationInvalidEmail,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { RoomService } from '@domain/communication/room/room.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import {
  CreateUserInput,
  DeleteUserInput,
  UpdateUserInput,
} from '@domain/community/user';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { DirectRoomResult } from '../../communication/communication/dto/communication.dto.send.direct.message.user.result';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { IProfile } from '@domain/common/profile/profile.interface';
import { PaginationArgs } from '@core/pagination';
import { applyUserFilter } from '@core/filtering/filters';
import { UserFilterInput } from '@core/filtering/input-types';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { validateEmail } from '@common/utils';
import { RoleSetRoleSelectionCredentials } from '../../access/role-set/dto/role.set.dto.role.selection.credentials';
import { RoleSetRoleWithParentCredentials } from '../../access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { contributorDefaults } from '../contributor/contributor.defaults';
import { UsersQueryArgs } from './dto/users.query.args';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { UpdateUserPlatformSettingsInput } from './dto/user.dto.update.platform.settings';
import { IAccount } from '@domain/space/account/account.interface';
import { User } from './user.entity';
import { IUser } from './user.interface';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';
import { ContributorService } from '../contributor/contributor.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AccountType } from '@common/enums/account.type';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomType } from '@common/enums/room.type';
import { UserSettingsService } from '../user-settings/user.settings.service';
import { UpdateUserSettingsEntityInput } from '../user-settings/dto/user.settings.dto.update';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { VisualType } from '@common/enums/visual.type';
import { InstrumentService } from '@src/apm/decorators';
import { CreateUserSettingsInput } from '../user-settings/dto/user.settings.dto.create';
import { UserAuthenticationLinkService } from '../user-authentication-link/user.authentication.link.service';
import { UserAuthenticationLinkOutcome } from '../user-authentication-link/user.authentication.link.types';

@InstrumentService()
@Injectable()
export class UserService {
  cacheOptions: CachingConfig = { ttl: 300 };

  constructor(
    private profileService: ProfileService,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private roomLookupService: RoomLookupService,
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  private getUserCommunicationIdCacheKey(communicationId: string): string {
    return `@user:communicationId:${communicationId}`;
  }

  private async setUserCache(user: IUser) {
    await this.cacheManager.set(
      this.getUserCommunicationIdCacheKey(user.email),
      user,
      this.cacheOptions
    );
  }

  private async clearUserCache(user: IUser) {
    await this.cacheManager.del(
      this.getUserCommunicationIdCacheKey(user.communicationID)
    );
    await this.agentInfoCacheService.deleteAgentInfoFromCache(user.email);
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
    user = await this.getUserOrFail(user.id);

    // all users need to be registered for communications at the absolute beginning
    // there are cases where a user could be messaged before they actually log-in
    // which will result in failure in communication (either missing user or unsent messages)
    // register the user asynchronously - we don't want to block the creation operation
    const communicationID = await this.communicationAdapter.tryRegisterNewUser(
      user.email
    );

    try {
      if (!communicationID) {
        this.logger.warn(
          `User registration failed on user creation ${user.id}.`
        );
        return user;
      }

      user.communicationID = communicationID;

      await this.save(user);
      await this.setUserCache(user);
    } catch (e: any) {
      this.logger.error(e, e?.stack, LogContext.USER);
    }

    await this.setUserCache(user);

    return user;
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

  async createUserFromAgentInfo(agentInfo: AgentInfo): Promise<IUser> {
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
      if (resolvedUser.outcome === UserAuthenticationLinkOutcome.LINKED) {
        await this.setUserCache(resolvedUser.user);
      }
      return resolvedUser.user;
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

    return await this.createUser(userData, agentInfo);
  }

  async clearAuthenticationIDForUser(user: IUser): Promise<IUser> {
    if (!user.authenticationID) {
      return user;
    }

    user.authenticationID = null;
    const updatedUser = await this.save(user);
    await this.clearUserCache(updatedUser);
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
    // Trim values to remove space issues
    userData.email = userData.email.trim();
    return true;
  }

  private async isUserNameIdAvailableOrFail(nameID: string) {
    const userCount = await this.userRepository.countBy({
      nameID: nameID,
    });
    if (userCount != 0)
      throw new ValidationException(
        `The provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserOrFail(userID, {
      relations: {
        profile: true,
        agent: true,
        storageAggregator: true,
        guidanceRoom: true,
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

    await this.clearUserCache(user);

    await this.profileService.deleteProfile(user.profile.id);

    await this.agentService.deleteAgent(user.agent.id);

    await this.authorizationPolicyService.delete(user.authorization);

    await this.storageAggregatorService.delete(user.storageAggregator.id);

    await this.userSettingsService.deleteUserSettings(user.settings.id);

    if (user.guidanceRoom) {
      await this.roomService.deleteRoom(user.guidanceRoom);
    }

    if (deleteData.deleteIdentity) {
      await this.kratosService.deleteIdentityByEmail(user.email);
    }

    const result = await this.userRepository.remove(user as User);

    // Note: Should we unregister the user from communications?

    return {
      ...result,
      id,
    };
  }

  public async getAccount(user: IUser): Promise<IAccount> {
    return await this.accountLookupService.getAccountOrFail(user.accountID);
  }

  async getUserOrFail(
    userID: string,
    options?: FindOneOptions<User>
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
    options?: FindOneOptions<User>
  ): Promise<IUser | never | null> {
    if (!validateEmail(email)) {
      throw new FormatNotSupportedException(
        `Incorrect format of the user email: ${email}`,
        LogContext.COMMUNITY
      );
    }

    return this.userRepository.findOne({
      where: { email: email },
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
      users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.agent', 'agent')
        .leftJoinAndSelect('agent.credentials', 'credential')
        .where('credential.type IN (:credentialsFilter)')
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
    const currentEntryRoleUsers =
      await this.userLookupService.usersWithCredential(
        entryRoleCredentials.role
      );
    const qb = this.userRepository.createQueryBuilder('user').select();

    if (entryRoleCredentials.parentRoleSetRole) {
      qb.leftJoin('user.agent', 'agent')
        .leftJoin('agent.credentials', 'credential')
        .addSelect(['credential.type', 'credential.resourceID'])
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: entryRoleCredentials.parentRoleSetRole.type,
          resourceID: entryRoleCredentials.parentRoleSetRole.resourceID,
        });
    }

    if (currentEntryRoleUsers.length > 0) {
      const hasWhere =
        qb.expressionMap.wheres && qb.expressionMap.wheres.length > 0;

      qb[hasWhere ? 'andWhere' : 'where'](
        'NOT user.id IN (:memberUsers)'
      ).setParameters({
        memberUsers: currentEntryRoleUsers.map(user => user.id),
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
    const currentElevatedRoleUsers =
      await this.userLookupService.usersWithCredential(
        roleSetCredentials.elevatedRole
      );
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select()
      .leftJoin('user.agent', 'agent')
      .leftJoin('agent.credentials', 'credential')
      .addSelect(['credential.type', 'credential.resourceID'])
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: roleSetCredentials.entryRole.type,
        resourceID: roleSetCredentials.entryRole.resourceID,
      });

    if (currentElevatedRoleUsers.length > 0) {
      qb.andWhere('NOT user.id IN (:leadUsers)').setParameters({
        leadUsers: currentElevatedRoleUsers.map(user => user.id),
      });
    }

    if (filter) {
      applyUserFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  async updateUser(userInput: UpdateUserInput): Promise<IUser> {
    const user = await this.getUserOrFail(userInput.ID, {
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
    await this.setUserCache(response);
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
      if (updateData.email !== user.email) {
        const userCheck = await this.userLookupService.isRegisteredUser(
          updateData.email
        );
        if (userCheck) {
          throw new ValidationException(
            `User profile with the specified email (${updateData.email}) already exists`,
            LogContext.COMMUNITY
          );
        }

        user.email = updateData.email;
      }
    }

    return await this.save(user);
  }

  async getProfile(user: IUser): Promise<IProfile> {
    const userWithProfile = await this.getUserOrFail(user.id, {
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
    const userWithStorage = await this.getUserOrFail(userID, {
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

  async getGuidanceRoom(userID: string): Promise<IRoom | undefined> {
    const userWithGuidanceRoom = await this.getUserOrFail(userID, {
      relations: {
        guidanceRoom: true,
      },
    });
    return userWithGuidanceRoom.guidanceRoom;
  }

  public async createGuidanceRoom(userId: string): Promise<IRoom> {
    const user = await this.getUserOrFail(userId, {
      relations: {
        guidanceRoom: true,
      },
    });

    if (user.guidanceRoom) {
      throw new Error(
        `Guidance room already exists for user with ID: ${userId}`
      );
    }

    const room = await this.roomService.createRoom(
      `${user.communicationID}-guidance`,
      RoomType.GUIDANCE
    );

    user.guidanceRoom = room;
    await this.save(user);

    return room;
  }

  public async getDirectRooms(user: IUser): Promise<DirectRoomResult[]> {
    const directRooms = await this.communicationAdapter.userGetDirectRooms(
      user.communicationID
    );

    await this.roomLookupService.populateRoomsMessageSenders(directRooms);

    return directRooms;
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
