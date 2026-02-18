import { ActorType, LogContext, ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
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
import { KratosSessionData } from '@core/authentication/kratos.session';
import { applyUserFilter } from '@core/filtering/filters';
import { UserFilterInput } from '@core/filtering/input-types';
import { PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { actorDefaults } from '@domain/actor/actor/actor.defaults';
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
import { InstrumentService } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { RoleSetRoleSelectionCredentials } from '../../access/role-set/dto/role.set.dto.role.selection.credentials';
import { RoleSetRoleWithParentCredentials } from '../../access/role-set/dto/role.set.dto.role.with.parent.credentials';
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
    private actorContextCacheService: ActorContextCacheService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageAggregatorService: StorageAggregatorService,
    private accountLookupService: AccountLookupService,
    private userLookupService: UserLookupService,
    private actorLookupService: ActorLookupService,
    private accountHostService: AccountHostService,
    private userSettingsService: UserSettingsService,
    private profileAvatarService: ProfileAvatarService,
    private kratosService: KratosService,
    private readonly messagingService: MessagingService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private async invalidateActorContextCache(user: IUser): Promise<void> {
    await this.actorContextCacheService.deleteByActorId(user.id);
  }

  async createUser(
    userData: CreateUserInput,
    kratosData?: KratosSessionData
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
    await this.profileAvatarService.addAvatarVisualToProfile(
      user.profile,
      userData.profileData,
      kratosData,
      userData.firstName,
      userData.lastName
    );

    // Note: Conversations now belong to the single platform Messaging.
    // User conversations are tracked via the conversation_membership pivot table.

    const authenticationID = kratosData?.authenticationID;
    if (authenticationID) {
      // Check that authentication ID is not already in use
      const existingUser =
        await this.userLookupService.getUserByAuthenticationID(
          authenticationID
        );
      if (existingUser) {
        throw new UserAlreadyRegisteredException(
          'Kratos identity already linked to another user'
        );
      }
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

    await this.profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket(
      user.profile.id,
      user.id
    );
    // Reload to ensure have the updated avatar URL
    user = await this.getUserByIdOrFail(user.id);

    // Sync the user to the communication adapter
    // User.id (which is Actor.id) is used as the AlkemioActorID for all communication operations
    const displayName =
      `${user.firstName} ${user.lastName}`.trim() || user.email;

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
      await this.messagingService.createConversation({
        callerAgentId: userID, // user.id = actorId in the new model
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
    // Invalidate cache by actorId
    await this.actorContextCacheService.deleteByActorId(user.id);
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

    await this.invalidateActorContextCache(user);

    await this.profileService.deleteProfile(user.profile.id);

    // Note: Credentials are on Actor (which User extends), will be deleted via cascade
    await this.authorizationPolicyService.delete(user.authorization);

    await this.storageAggregatorService.delete(user.storageAggregator.id);

    await this.userSettingsService.deleteUserSettings(user.settings.id);

    // Note: Conversations belong to the platform Messaging.
    // User's conversation memberships are cleaned up via cascade.
    // TODO: Consider deleting conversations where this user is the only member

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
      // User extends Actor which has the credentials relationship
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
      await this.actorLookupService.getActorIdsWithCredential(
        entryRoleCredentials.role,
        [ActorType.USER]
      );
    const qb = this.userRepository.createQueryBuilder('user').select();

    if (entryRoleCredentials.parentRoleSetRole) {
      // User extends Actor which has the credentials relationship
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
      await this.actorLookupService.getActorIdsWithCredential(
        roleSetCredentials.elevatedRole,
        [ActorType.USER]
      );
    // User extends Actor which has the credentials relationship
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
      await this.namingService.getReservedNameIDsInUsers(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }
}
