import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  AuthenticationException,
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { AgentInfo } from '@core/authentication/agent-info';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationRoomResult } from '@domain/communication/room/dto/communication.dto.room.result';
import { RoomService } from '@domain/communication/room/room.service';
import { CreateProfileInput, IProfile } from '@domain/community/profile';
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
import { CommunicationAdapter } from '@services/platform/communication-adapter/communication.adapter';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { DirectRoomResult } from './dto/user.dto.communication.room.direct.result';
import { UserPreferenceService } from '../user-preferences';
import { KonfigService } from '@services/platform/configuration/config/config.service';
import { IUserTemplate } from '@services/platform/configuration';

@Injectable()
export class UserService {
  replaceSpecialCharacters = require('replace-special-characters');
  cacheOptions: CachingConfig = { ttl: 300 };

  constructor(
    private profileService: ProfileService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationAdapter: CommunicationAdapter,
    private roomService: RoomService,
    private agentService: AgentService,
    @Inject(UserPreferenceService)
    private userPreferenceService: UserPreferenceService,
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
    if (user.profile.avatar === '') {
      user.profile.avatar = this.profileService.generateRandomAvatar(
        user.firstName,
        user.lastName
      );
    }

    const response = await this.userRepository.save(user);

    user.preferences =
      await this.userPreferenceService.createInitialUserPreferences(response);
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

  async getUserTemplate(): Promise<IUserTemplate | undefined> {
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
    if (!email || email.length === 0 || (await this.isRegisteredUser(email))) {
      throw new AuthenticationException(
        `Invalid attempt to create a new User profile for user: ${email}`
      );
    }
    return await this.createUser({
      nameID: this.createUserNameID(agentInfo.firstName, agentInfo.lastName),
      email: email,
      firstName: agentInfo.firstName,
      lastName: agentInfo.lastName,
      displayName: `${agentInfo.firstName} ${agentInfo.lastName}`,
      accountUpn: email,
    });
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserOrFail(userID, {
      relations: ['profile', 'agent', 'preferences'],
    });
    const { id } = user;
    await this.clearUserCache(user);

    if (user.profile) {
      await this.profileService.deleteProfile(user.profile.id);
    }

    if (user.preferences) {
      for (const preference of user.preferences) {
        await this.userPreferenceService.removeUserPreference(preference);
      }
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

  async validateUserProfileCreationRequest(
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

  async isNameIdAvailableOrFail(nameID: string) {
    const userCount = await this.userRepository.count({
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

  async getPreferences(userID: string) {
    const user = await this.getUserOrFail(userID, {
      relations: ['preferences'],
    });

    const preferences = user.preferences;

    if (!preferences) {
      throw new EntityNotInitializedException(
        `User preferences not initialized: ${userID}`,
        LogContext.COMMUNITY
      );
    }

    return preferences;
  }

  async getUserOrFail(
    userID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    let user: IUser | undefined;

    if (this.validateEmail(userID)) {
      user = await this.userRepository.findOne(
        {
          email: userID,
        },
        options
      );
    } else if (userID.length === UUID_LENGTH) {
      {
        user = await this.userRepository.findOne(
          {
            id: userID,
          },
          options
        );
      }
    } else {
      user = await this.userRepository.findOne(
        {
          nameID: userID,
        },
        options
      );
    }

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

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    if (!this.validateEmail(email)) {
      throw new FormatNotSupportedException(
        `Incorrect format of the user email: ${email}`,
        LogContext.COMMUNITY
      );
    }

    const user = await this.userRepository.findOne(
      {
        email,
      },
      options
    );

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

  async getUserByCommunicationIdOrFail(
    communicationID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    let user: IUser | undefined = await this.cacheManager.get<IUser>(
      this.getUserCommunicationIdCacheKey(communicationID)
    );

    if (!user) {
      user = await this.userRepository.findOne(
        {
          communicationID: communicationID,
        },
        options
      );

      if (!user) {
        throw new EntityNotFoundException(
          `Unable to find user with given communicationID: ${communicationID}`,
          LogContext.COMMUNITY
        );
      }

      await this.setUserCache(user);
    }

    return user;
  }

  validateEmail(email: string): boolean {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  }

  async isRegisteredUser(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ email: email });
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

  async getUsers(): Promise<IUser[]> {
    return (await this.userRepository.find({ serviceProfile: false })) || [];
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
    if (userInput.city !== undefined) {
      user.city = userInput.city;
    }
    if (userInput.country !== undefined) {
      user.country = userInput.country;
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
    credentialCriteria: CredentialsSearchInput
  ): Promise<IUser[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    const userMatches = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getMany();

    // reload to go through the normal loading path
    const results: IUser[] = [];
    for (const user of userMatches) {
      const loadedOrganization = await this.getUserOrFail(user.id);
      results.push(loadedOrganization);
    }
    return results;
  }

  getAgentOrFail(user: IUser): IAgent {
    const agent = user.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `Unable to find agent for user: ${user.id}`,
        LogContext.AUTH
      );
    return agent;
  }

  async hasMatchingCredential(
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
    return await this.userRepository.count({ serviceProfile: false });
  }

  async tryRegisterUserCommunication(user: IUser): Promise<string | undefined> {
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
    const nameIDExcludedCharacters = /[^a-zA-Z0-9/-]/g;
    let randomSuffix = '';
    if (useRandomSuffix) {
      const randomNumber = Math.floor(Math.random() * 10000).toString();
      randomSuffix = `-${randomNumber}`;
    }
    // replace spaces + trim to 25 characters
    const nameID = `${firstName}-${lastName}${randomSuffix}`.replace(/\s/g, '');
    // replace characters with umlouts etc to normal characters
    const nameIDNoSpecialCharacters = this.replaceSpecialCharacters(nameID);
    // Remove any characters that are not allowed
    return nameIDNoSpecialCharacters
      .replace(nameIDExcludedCharacters, '')
      .toLowerCase()
      .slice(0, 25);
  }
}
