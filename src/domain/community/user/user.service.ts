import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  AuthenticationException,
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { FormatNotSupportedException } from '@common/exceptions/format.not.supported.exception';
import { AgentInfo } from '@core/authentication/agent-info';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/community/profile';
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
import { CommunityRoom } from '@services/platform/communication';
import { DirectRoom } from '@services/platform/communication/communication.room.dto.direct';
import { CommunicationService } from '@services/platform/communication/communication.service';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';

@Injectable()
export class UserService {
  replaceSpecialCharacters = require('replace-special-characters');
  cacheOptions: CachingConfig = { ttl: 300 };

  constructor(
    private profileService: ProfileService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private communicationService: CommunicationService,
    private agentService: AgentService,
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
  }

  async createUser(userData: CreateUserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    const user: IUser = User.create(userData);
    user.authorization = new AuthorizationPolicy();

    user.profile = await this.profileService.createProfile(
      userData.profileData
    );

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

    // all users need to be registered for communications at the absolute beginning
    // there are cases where a user could be messaged before they actually log-in
    // which will result in failure in communication (either missing user or unsent messages)
    // register the user asynchronously - we don't want to block the creation operation
    this.communicationService.tryRegisterNewUser(user.email).then(
      async communicationID => {
        try {
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
      relations: ['profile', 'agent'],
    });
    const { id } = user;
    await this.clearUserCache(user);

    if (user.profile) {
      await this.profileService.deleteProfile(user.profile.id);
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
      const communicationID = await this.registerUserCommunication(user);
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
    if (this.validateEmail(email)) {
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
      const communicationID = await this.registerUserCommunication(user);
      user.communicationID = communicationID;

      await this.userRepository.save(user);
      await this.setUserCache(user);
    }

    return user;
  }

  async getUserByCommunicationId(
    communicationID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
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

      if (user) {
        await this.setUserCache(user);
      }
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
    return (await this.userRepository.find()) || [];
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

  getProfile(user: IUser): IProfile {
    const profile = user.profile;
    if (!profile)
      throw new EntityNotInitializedException(
        `User Profile not initialized: ${user.id}`,
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
    return await this.userRepository.count();
  }

  async getUserIDByCommunicationsID(communicationID: string): Promise<string> {
    const userMatch = await this.userRepository
      .createQueryBuilder('user')
      .where('user.communicationID = :communicationID')
      .setParameters({
        communicationID: `${communicationID}`,
      })
      .getOne();
    if (userMatch) return userMatch.id;
    return '';
  }

  async registerUserCommunication(user: IUser): Promise<string> {
    const communicationID = await this.communicationService.tryRegisterNewUser(
      user.email
    );

    return communicationID;
  }

  // Not sure about the placement of this one
  async populateRoomMessageSenders(rooms: (CommunityRoom | DirectRoom)[]) {
    const knownSendersMap = new Map();
    for (const room of rooms) {
      for (const message of room.messages) {
        let knownSender = knownSendersMap.get(message.senderId);
        if (!knownSender) {
          knownSender = await this.getUserIDByCommunicationsID(
            message.senderId
          );
          knownSendersMap.set(message.senderId, knownSender);
        }
        message.senderId = knownSender;
      }
    }

    return rooms;
  }

  createUserNameID(firstName: string, lastName: string): string {
    const randomNumber = Math.floor(Math.random() * 10000).toString();
    const nameID = `${firstName}-${lastName}-${randomNumber}`
      .replace(/\s/g, '')
      .slice(0, 25);
    return this.replaceSpecialCharacters(nameID);
  }
}
