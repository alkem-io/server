import { UUID_LENGTH } from '@common/constants';
import { LogContext, UserPreferenceType } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { AgentInfo } from '@core/authentication/agent-info';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import {
  Credential,
  CredentialsSearchInput,
  ICredential,
} from '@domain/agent/credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { RoomService } from '@domain/communication/room/room.service';
import { ProfileService } from '@domain/community/profile/profile.service';
import {
  CreateUserInput,
  DeleteUserInput,
  IUser,
  UpdateUserInput,
  User,
} from '@domain/community/user';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, In, Repository } from 'typeorm';
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { KonfigService } from '@src/platform/configuration/config/config.service';
import { IUserTemplate } from '@src/platform/configuration';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IPreferenceSet } from '@domain/common/preference-set/preference.set.interface';
import { IProfile } from '../profile/profile.interface';
import { PaginationArgs } from '@core/pagination';
import { applyFiltering, UserFilterInput } from '@core/filtering';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { CreateProfileInput } from '../profile/dto/profile.dto.create';
import { validateEmail } from '@common/utils';
import { AgentInfoMetadata } from '@core/authentication/agent-info-metadata';
import { CommunityCredentials } from './dto/user.dto.community.credentials';
import { CommunityMemberCredentials } from './dto/user.dto.community.member.credentials';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';

@Injectable()
export class UserService {
  cacheOptions: CachingConfig = { ttl: 300 };

  constructor(
    private profileService: ProfileService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private namingService: NamingService,
    private agentService: AgentService,
    private preferenceSetService: PreferenceSetService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private konfigService: KonfigService
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
  }

  async createUser(userData: CreateUserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    const user: IUser = User.create(userData);
    user.authorization = new AuthorizationPolicy();

    const profileData = await this.extendProfileDataWithReferences(
      userData.profileData
    );
    user.profile = await this.profileService.createProfile(profileData);
    user.agent = await this.agentService.createAgent({
      parentDisplayID: user.email,
    });

    this.logger.verbose?.(
      `Created a new user with nameID: ${user.nameID}`,
      LogContext.COMMUNITY
    );

    // ensure have a random avatar. todo: use a package we control
    if (user.profile.avatar?.uri === '') {
      user.profile.avatar.uri = this.profileService.generateRandomAvatar(
        user.firstName,
        user.lastName
      );
    }

    user.preferenceSet = await this.preferenceSetService.createPreferenceSet(
      PreferenceDefinitionSet.USER,
      this.createPreferenceDefaults()
    );

    const response = await this.userRepository.save(user);
    // all users need to be registered for communications at the absolute beginning
    // there are cases where a user could be messaged before they actually log-in
    // which will result in failure in communication (either missing user or unsent messages)
    // register the user asynchronously - we don't want to block the creation operation
    this.communicationAdapter.tryRegisterNewUser(user.email).then(
      async communicationID => {
        try {
          if (!communicationID) {
            this.logger.warn(
              `User registration failed on user creation ${user.id}.`
            );
            return user;
          }

          response.communicationID = communicationID;

          await this.userRepository.save(response);
          await this.setUserCache(response);
        } catch (e) {
          this.logger.error(e);
        }
      },
      error => this.logger.error(error)
    );

    await this.setUserCache(response);

    return response;
  }

  private async extendProfileDataWithReferences(
    profileData?: CreateProfileInput
  ): Promise<CreateProfileInput> {
    // ensure the result + references are there
    let result = profileData;
    if (!result) {
      result = {
        referencesData: [],
      };
    }
    if (!result.referencesData) {
      result.referencesData = [];
    }
    // Get the template to populate with
    const referenceTemplates = (await this.getUserTemplate())?.references;
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
    defaults.set(UserPreferenceType.NOTIFICATION_COMMUNICATION_UPDATES, 'true');
    defaults.set(
      UserPreferenceType.NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN,
      'true'
    );

    defaults.set(
      UserPreferenceType.NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED,
      'true'
    );
    defaults.set(
      UserPreferenceType.NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN,
      'true'
    );

    defaults.set(UserPreferenceType.NOTIFICATION_APPLICATION_RECEIVED, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_APPLICATION_SUBMITTED, 'true');

    defaults.set(UserPreferenceType.NOTIFICATION_CANVAS_CREATED, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_ASPECT_CREATED, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_ASPECT_CREATED_ADMIN, 'true');
    defaults.set(
      UserPreferenceType.NOTIFICATION_ASPECT_COMMENT_CREATED,
      'true'
    );

    defaults.set(
      UserPreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER,
      'true'
    );
    defaults.set(
      UserPreferenceType.NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN,
      'true'
    );
    defaults.set(UserPreferenceType.NOTIFICATION_CALLOUT_PUBLISHED, 'true');
    // messaging & mentions
    defaults.set(UserPreferenceType.NOTIFICATION_COMMUNICATION_MENTION, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_COMMUNICATION_MESSAGE, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_ORGANIZATION_MENTION, 'true');
    defaults.set(UserPreferenceType.NOTIFICATION_ORGANIZATION_MESSAGE, 'true');

    return defaults;
  }

  private async getUserTemplate(): Promise<IUserTemplate | undefined> {
    const template = await this.konfigService.getTemplate();
    const userTemplates = template.users;
    if (userTemplates && userTemplates.length > 0) {
      // assume only one, which is the case currently + will be enforced later when we update template handling
      return userTemplates[0];
    }
    return undefined;
  }

  async createUserFromAgentInfo(agentInfo: AgentInfo): Promise<IUser> {
    // Extra check that there is valid data + no user with the email
    const email = agentInfo.email;
    if (!email || email.length === 0) {
      throw new UserRegistrationInvalidEmail(
        `Invalid email provided: ${email}`
      );
    }

    if (await this.isRegisteredUser(email)) {
      throw new UserAlreadyRegisteredException(
        `User with email: ${email} already registered`
      );
    }

    return await this.createUser({
      nameID: this.createUserNameID(agentInfo.firstName, agentInfo.lastName),
      email: email,
      firstName: agentInfo.firstName,
      lastName: agentInfo.lastName,
      displayName: `${agentInfo.firstName} ${agentInfo.lastName}`,
      accountUpn: email,
      profileData: {
        avatarURL: agentInfo.avatarURL,
      },
    });
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserOrFail(userID, {
      relations: ['profile', 'agent', 'preferenceSet'],
    });
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

    const result = await this.userRepository.remove(user as User);

    // Note: Should we unregister the user from communications?

    return {
      ...result,
      id,
    };
  }

  private async validateUserProfileCreationRequest(
    userData: CreateUserInput
  ): Promise<boolean> {
    await this.isNameIdAvailableOrFail(userData.nameID);
    const userCheck = await this.isRegisteredUser(userData.email);
    if (userCheck)
      throw new ValidationException(
        `User profile with the specified email (${userData.email}) already exists`,
        LogContext.COMMUNITY
      );
    // Trim values to remove space issues
    userData.email = userData.email.trim();
    return true;
  }

  private async isNameIdAvailableOrFail(nameID: string) {
    const userCount = await this.userRepository.countBy({
      nameID: nameID,
    });
    if (userCount != 0)
      throw new ValidationException(
        `The provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async saveUser(user: IUser): Promise<IUser> {
    return await this.userRepository.save(user);
  }

  async getPreferenceSetOrFail(userID: string): Promise<IPreferenceSet> {
    const user = await this.getUserOrFail(userID, {
      relations: ['preferenceSet', 'preferenceSet.preferences'],
    });

    if (!user.preferenceSet) {
      throw new EntityNotInitializedException(
        `User preferences not initialized or not found for user with nameID: ${user.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return user.preferenceSet;
  }

  async getUserOrFail(
    userID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | never> {
    const user = await this.getUserByEmailIdUUID(userID, options);

    if (!user) {
      throw new EntityNotFoundException(
        `Unable to find user with given ID: ${userID}`,
        LogContext.COMMUNITY
      );
    }

    // check if the user is registered for communications
    // should go through this block only once
    // we want this to happen synchronously
    if (!Boolean(user.communicationID)) {
      const communicationID = await this.tryRegisterUserCommunication(user);

      if (!communicationID) {
        this.logger.warn(
          `Unable to register user for communication: ${user.email}`,
          LogContext.COMMUNICATION
        );
        return user;
      }

      user.communicationID = communicationID;

      await this.userRepository.save(user);
      // need to update the cache in case the user is already in it
      // but the previous registration attempt has failed
      await this.setUserCache(user);
    }

    return user;
  }

  private async getUserByEmailIdUUID(
    userID: string,
    options: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    let user: IUser | null = null;

    if (await this.isUserIdEmail(userID)) {
      user = await this.userRepository.findOne({
        where: {
          email: userID,
        },
        ...options,
      });
    } else if (userID.length === UUID_LENGTH) {
      {
        user = await this.userRepository.findOne({
          where: {
            id: userID,
          },
          ...options,
        });
      }
    }

    if (!user)
      user = await this.userRepository.findOne({
        where: {
          nameID: userID,
        },
        ...options,
      });

    return user;
  }

  private async isUserIdEmail(userId: string): Promise<boolean> {
    if (userId.includes('@')) return true;
    return false;
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

    const user = await this.userRepository.findOne({
      where: { email: email },
      ...options,
    });

    // same as in getUserOrFail
    if (user && !Boolean(user?.communicationID)) {
      const communicationID = await this.tryRegisterUserCommunication(user);

      if (!communicationID) {
        this.logger.warn(
          `User could not be registered for communication ${user.id}`,
          LogContext.COMMUNICATION
        );
        return user;
      }

      user.communicationID = communicationID;

      await this.userRepository.save(user);
      await this.setUserCache(user);
    }

    return user;
  }
  async isRegisteredUser(email: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ email: email });
    if (user) return true;
    return false;
  }

  async getUserAndCredentials(
    userID: string
  ): Promise<{ user: IUser; credentials: ICredential[] }> {
    const user = await this.getUserOrFail(userID, {
      relations: ['agent'],
    });

    if (!user.agent || !user.agent.credentials) {
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${userID}`,
        LogContext.AUTH
      );
    }
    return { user: user, credentials: user.agent.credentials };
  }

  async getUserAndAgent(
    userID: string
  ): Promise<{ user: IUser; agent: IAgent }> {
    const user = await this.getUserOrFail(userID, {
      relations: ['agent'],
    });

    if (!user.agent) {
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${userID}`,
        LogContext.AUTH
      );
    }
    return { user: user, agent: user.agent };
  }

  async getUserWithAgent(userID: string): Promise<IUser> {
    const user = await this.getUserOrFail(userID, {
      relations: ['agent'],
    });

    if (!user.agent || !user.agent.credentials) {
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${userID}`,
        LogContext.AUTH
      );
    }
    return user;
  }

  async getUsersByIDs(userIDs: string[]): Promise<IUser[]> {
    const users = await this.userRepository.find({
      where: { id: In(userIDs) },
    });

    return users;
  }

  async getUsers(args: ContributorQueryArgs): Promise<IUser[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;

    this.logger.verbose?.(
      `Querying all users with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );
    const credentialsFilter = args.filter?.credentials;
    let users = [];
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
    return limitAndShuffle(users, limit, shuffle);
  }

  async getPaginatedUsers(
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const qb = await this.userRepository.createQueryBuilder().select();

    if (filter) {
      applyFiltering(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  public async getPaginatedAvailableMemberUsers(
    communityCredentials: CommunityMemberCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentMemberUsers = await this.usersWithCredentials(
      communityCredentials.member
    );
    const qb = this.userRepository.createQueryBuilder('user').select();

    if (communityCredentials.parentCommunityMember) {
      qb.leftJoin('user.agent', 'agent')
        .leftJoin('agent.credentials', 'credential')
        .addSelect(['credential.type', 'credential.resourceID'])
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: communityCredentials.parentCommunityMember.type,
          resourceID: communityCredentials.parentCommunityMember.resourceID,
        });
    }

    if (currentMemberUsers.length > 0) {
      const hasWhere =
        qb.expressionMap.wheres && qb.expressionMap.wheres.length > 0;

      qb[hasWhere ? 'andWhere' : 'where'](
        'NOT user.id IN (:memberUsers)'
      ).setParameters({
        memberUsers: currentMemberUsers.map(user => user.id),
      });
    }

    if (filter) {
      applyFiltering(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  public async getPaginatedAvailableLeadUsers(
    communityCredentials: CommunityCredentials,
    paginationArgs: PaginationArgs,
    filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const currentLeadUsers = await this.usersWithCredentials(
      communityCredentials.lead
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
        type: communityCredentials.member.type,
        resourceID: communityCredentials.member.resourceID,
      });

    if (currentLeadUsers.length > 0) {
      qb.andWhere('NOT user.id IN (:leadUsers)').setParameters({
        leadUsers: currentLeadUsers.map(user => user.id),
      });
    }

    if (filter) {
      applyFiltering(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  async updateUser(userInput: UpdateUserInput): Promise<IUser> {
    const user = await this.getUserOrFail(userInput.ID);

    if (userInput.nameID) {
      if (userInput.nameID.toLowerCase() !== user.nameID.toLowerCase()) {
        // new NameID, check for uniqueness
        await this.isNameIdAvailableOrFail(userInput.nameID);
        user.nameID = userInput.nameID;
      }
    }
    if (userInput.displayName !== undefined) {
      user.displayName = userInput.displayName;
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

    if (userInput.gender !== undefined) {
      user.gender = userInput.gender;
    }

    if (userInput.serviceProfile !== undefined) {
      user.serviceProfile = userInput.serviceProfile;
    }

    if (userInput.profileData) {
      user.profile = await this.profileService.updateProfile(
        userInput.profileData
      );
    }

    const response = await this.userRepository.save(user);
    await this.setUserCache(response);
    return response;
  }

  async getAgent(userID: string): Promise<IAgent> {
    const userWithAgent = await this.getUserOrFail(userID, {
      relations: ['agent'],
    });
    const agent = userWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${userID}`,
        LogContext.AUTH
      );

    return agent;
  }

  async getProfile(user: IUser): Promise<IProfile> {
    const userWithProfile = await this.getUserOrFail(user.id, {
      relations: ['profile'],
    });
    const profile = userWithProfile.profile;
    if (!profile)
      throw new RelationshipNotFoundException(
        `Unable to load Profile for User: ${user.nameID} `,
        LogContext.COMMUNITY
      );

    return profile;
  }

  async usersWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IUser[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .take(limit)
      .getMany();
  }

  async countUsersWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';
    const userMatchesCount = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getCount();

    return userMatchesCount;
  }

  private getAgentOrFail(user: IUser): IAgent {
    const agent = user.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `Unable to find agent for user: ${user.id}`,
        LogContext.AUTH
      );
    return agent;
  }

  private async hasMatchingCredential(
    user: IUser,
    credentialCriteria: CredentialsSearchInput
  ) {
    const agent = this.getAgentOrFail(user);
    return await this.agentService.hasValidCredential(
      agent.id,
      credentialCriteria
    );
  }

  async getUserCount(): Promise<number> {
    return await this.userRepository.countBy({ serviceProfile: false });
  }

  private async tryRegisterUserCommunication(
    user: IUser
  ): Promise<string | undefined> {
    const communicationID = await this.communicationAdapter.tryRegisterNewUser(
      user.email
    );

    return communicationID;
  }

  async getCommunityRooms(user: IUser): Promise<CommunicationRoomResult[]> {
    const communityRooms = await this.communicationAdapter.getCommunityRooms(
      user.communicationID
    );

    await this.roomService.populateRoomMessageSenders(communityRooms);

    return communityRooms;
  }

  async getDirectRooms(user: IUser): Promise<DirectRoomResult[]> {
    const directRooms = await this.communicationAdapter.getDirectRooms(
      user.communicationID
    );

    await this.roomService.populateRoomMessageSenders(directRooms);

    return directRooms;
  }

  createUserNameID(
    firstName: string,
    lastName: string,
    useRandomSuffix = true
  ): string {
    const base = `${firstName}-${lastName}`;
    return this.namingService.createNameID(base, useRandomSuffix);
  }

  async findProfilesByBatch(userIds: string[]): Promise<(IProfile | Error)[]> {
    const users = await this.userRepository.find({
      where: {
        id: In(userIds),
      },
      relations: ['profile'],
      select: ['id'],
    });

    const results = users.filter(user => userIds.includes(user.id));
    const mappedResults = userIds.map(
      id =>
        results.find(result => result.id === id)?.profile ||
        new Error(`Could not load user ${id}`)
    );
    return mappedResults;
  }

  public getAgentInfoMetadata(
    email: string
  ): Promise<AgentInfoMetadata> | never {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.agent', 'agent')
      .leftJoin('agent.credentials', 'credentials')
      .select([
        'user.id as userID',
        'user.communicationID as communicationID',
        'agent.id as agentID',
        'credentials.id as id',
        'credentials.resourceId as resourceID',
        'credentials.type as type',
      ])
      .where('user.email = :email', { email: email })
      .getRawMany<AgentInfoMetadata & Credential>()
      .then(agentsWithCredentials => {
        if (agentsWithCredentials.length === 0) {
          throw new EntityNotFoundException(
            `Unable to load User, Agent or Credentials for User: ${email}`,
            LogContext.COMMUNITY
          );
        }

        const agentInfo = new AgentInfoMetadata();
        const credentials: ICredential[] = [];
        for (const agent of agentsWithCredentials) {
          credentials.push({
            id: agent.id,
            resourceID: agent.resourceID,
            type: agent.type,
          });
        }

        agentInfo.credentials = credentials;
        agentInfo.agentID = agentsWithCredentials[0].agentID;
        agentInfo.userID = agentsWithCredentials[0].userID;
        agentInfo.communicationID = agentsWithCredentials[0].communicationID;

        return agentInfo;
      });
  }
}
