import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { ProfileService } from '@domain/community/profile/profile.service';
import {
  UpdateUserInput,
  CreateUserInput,
  DeleteUserInput,
  User,
  IUser,
} from '@domain/community/user';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Agent, IAgent } from '@domain/agent/agent';
import { UUID_LENGTH } from '@common/constants';
import { IProfile } from '@domain/community/profile';
import { LogContext } from '@common/enums';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';

@Injectable()
export class UserService {
  constructor(
    private profileService: ProfileService,
    private agentService: AgentService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createUser(userData: CreateUserInput): Promise<IUser> {
    await this.validateUserProfileCreationRequest(userData);

    const user: IUser = User.create(userData);
    user.authorization = new AuthorizationDefinition();

    user.profile = await this.profileService.createProfile(
      userData.profileData
    );

    user.agent = await this.agentService.createAgent({
      parentDisplayID: user.email,
    });

    this.logger.verbose?.(
      `Created a new user with id: ${user.id}`,
      LogContext.COMMUNITY
    );

    // save the user to get the id
    await this.userRepository.save(user);

    // Ensure the user has the global registered credential
    if (!user.agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${user.id}`,
        LogContext.AUTH
      );

    return await this.userRepository.save(user);
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserOrFail(userID);
    const { id } = user;

    if (user.profile) {
      await this.profileService.deleteProfile(user.profile.id);
    }

    if (user.agent) {
      await this.agentService.deleteAgent(user.agent.id);
    }

    const result = await this.userRepository.remove(user as User);
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
        `Unable to create User: the provided nameID is already taken: ${nameID}`,
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
      if (userInput.nameID !== user.nameID) {
        // new NameID, check for uniqueness
        await this.isNameIdAvailableOrFail(userInput.nameID);
        user.nameID = userInput.nameID;
      }
    }
    if (userInput.displayName) {
      user.displayName = userInput.displayName;
    }
    if (userInput.firstName) {
      user.firstName = userInput.firstName;
    }
    if (userInput.lastName) {
      user.lastName = userInput.lastName;
    }
    if (userInput.phone) {
      user.phone = userInput.phone;
    }
    if (userInput.city) {
      user.city = userInput.city;
    }
    if (userInput.country) {
      user.country = userInput.country;
    }
    if (userInput.gender) {
      user.gender = userInput.gender;
    }

    if (userInput.profileData) {
      user.profile = await this.profileService.updateProfile(
        userInput.profileData
      );
    }

    return await this.userRepository.save(user);
  }

  async getAgent(user: IUser): Promise<IAgent> {
    const userWithAgent = await this.getUserOrFail(user.id, {
      relations: ['agent'],
    });
    const agent = userWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${user.id}`,
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
    const matchingAgents = await this.agentService.findAgentsWithMatchingCredentials(
      credentialCriteria
    );

    const users: IUser[] = [];
    for (const matchedAgent of matchingAgents) {
      const agent = await this.agentService.getAgentOrFail(matchedAgent.id, {
        relations: ['user'],
      });
      const userID = (agent as Agent).user?.id;
      if (userID) {
        const user = await this.getUserOrFail(userID, {
          relations: ['agent'],
        });
        users.push(user);
      }
    }
    return users;
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
}
