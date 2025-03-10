import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
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
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
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
import { userDefaults } from './user.defaults';
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
import { IUserSettings } from '../user.settings/user.settings.interface';
import { UserSettingsService } from '../user.settings/user.settings.service';
import { UpdateUserSettingsEntityInput } from '../user.settings/dto/user.settings.dto.update';
import { PreferenceType } from '@common/enums/preference.type';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { UserLookupService } from '../user-lookup/user.lookup.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { VisualType } from '@common/enums/visual.type';
import { InstrumentService } from '@src/apm/decorators';

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
    private preferenceSetService: PreferenceSetService,
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
      accountUpn: userData.accountUpn ?? userData.email,
    });
    user.authorization = new AuthorizationPolicy(AuthorizationPolicyType.USER);
    user.settings = this.getDefaultUserSettings();

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

    await this.profileService.addTagsetOnProfile(user.profile, {
      name: TagsetReservedName.SKILLS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(user.profile, {
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

    this.logger.verbose?.(
      `Created a new user with email: ${user.email}`,
      LogContext.COMMUNITY
    );

    user.preferenceSet = await this.preferenceSetService.createPreferenceSet(
      PreferenceDefinitionSet.USER,
      this.createPreferenceDefaults()
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

  private getDefaultUserSettings(): IUserSettings {
    const settings: IUserSettings = {
      communication: {
        allowOtherUsersToSendMessages: true,
      },
      privacy: {
        // Note: not currently used but will be near term.
        contributionRolesPubliclyVisible: true,
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
    const referenceTemplates = userDefaults.references;
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

  private createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(PreferenceType.NOTIFICATION_COMMUNICATION_UPDATES, 'true');
    defaults.set(
      PreferenceType.NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN,
      'true'
    );

    defaults.set(
      PreferenceType.NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED,
      'true'
    );
    defaults.set(
      PreferenceType.NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN,
      'true'
    );

    defaults.set(PreferenceType.NOTIFICATION_APPLICATION_RECEIVED, 'true');
    defaults.set(PreferenceType.NOTIFICATION_APPLICATION_SUBMITTED, 'true');

    defaults.set(PreferenceType.NOTIFICATION_WHITEBOARD_CREATED, 'true');
    defaults.set(PreferenceType.NOTIFICATION_POST_CREATED, 'true');
    defaults.set(PreferenceType.NOTIFICATION_POST_CREATED_ADMIN, 'true');
    defaults.set(PreferenceType.NOTIFICATION_POST_COMMENT_CREATED, 'true');

    defaults.set(
      PreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER,
      'true'
    );
    defaults.set(
      PreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN,
      'true'
    );
    defaults.set(PreferenceType.NOTIFICATION_COMMUNITY_INVITATION_USER, 'true');
    defaults.set(PreferenceType.NOTIFICATION_CALLOUT_PUBLISHED, 'true');
    // messaging & mentions
    defaults.set(PreferenceType.NOTIFICATION_COMMUNICATION_MENTION, 'true');
    defaults.set(PreferenceType.NOTIFICATION_ORGANIZATION_MENTION, 'true');
    defaults.set(PreferenceType.NOTIFICATION_ORGANIZATION_MESSAGE, 'true');

    defaults.set(PreferenceType.NOTIFICATION_FORUM_DISCUSSION_CREATED, 'false');
    defaults.set(PreferenceType.NOTIFICATION_FORUM_DISCUSSION_COMMENT, 'true');

    defaults.set(PreferenceType.NOTIFICATION_COMMENT_REPLY, 'true');

    return defaults;
  }

  async createUserFromAgentInfo(agentInfo: AgentInfo): Promise<IUser> {
    // Extra check that there is valid data + no user with the email
    const email = agentInfo.email;
    if (!email || email.length === 0) {
      throw new UserRegistrationInvalidEmail(
        `Invalid email provided: ${email}`
      );
    }

    if (await this.userLookupService.isRegisteredUser(email)) {
      throw new UserAlreadyRegisteredException(
        `User with email: ${email} already registered`
      );
    }

    const userData: CreateUserInput = {
      email: email,
      firstName: agentInfo.firstName,
      lastName: agentInfo.lastName,
      accountUpn: email,
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
        preferenceSet: true,
        storageAggregator: true,
        guidanceRoom: true,
      },
    });

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

    if (user.profile) {
      await this.profileService.deleteProfile(user.profile.id);
    }

    if (user.preferenceSet) {
      await this.preferenceSetService.deletePreferenceSet(
        user.preferenceSet.id
      );
    }

    if (user.agent) {
      await this.agentService.deleteAgent(user.agent.id);
    }

    if (user.authorization) {
      await this.authorizationPolicyService.delete(user.authorization);
    }

    if (user.storageAggregator) {
      await this.storageAggregatorService.delete(user.storageAggregator.id);
    }

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

  async getPreferenceSetOrFail(userID: string): Promise<IPreferenceSet> {
    const user = await this.getUserOrFail(userID, {
      relations: {
        preferenceSet: {
          preferences: true,
        },
      },
    });

    if (!user.preferenceSet) {
      throw new EntityNotInitializedException(
        `User preferences not initialized or not found for user with nameID: ${user.id}`,
        LogContext.COMMUNITY
      );
    }

    return user.preferenceSet;
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
      await this.userLookupService.usersWithCredentials(
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
      await this.userLookupService.usersWithCredentials(
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

  private tryRegisterUserCommunication(
    user: IUser
  ): Promise<string | undefined> {
    return this.communicationAdapter.tryRegisterNewUser(user.email);
  }

  async getCommunityRooms(user: IUser): Promise<CommunicationRoomResult[]> {
    const communityRooms = await this.communicationAdapter.getCommunityRooms(
      user.communicationID
    );

    await this.roomLookupService.populateRoomsMessageSenders(communityRooms);

    return communityRooms;
  }

  async getDirectRooms(user: IUser): Promise<DirectRoomResult[]> {
    const directRooms = await this.communicationAdapter.getDirectRooms(
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
