import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import validator from 'validator';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import {
  UpdateUserInput,
  CreateUserInput,
  User,
  IUser,
} from '@domain/community/user';
import { DeleteUserInput } from './user.dto.delete';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AuthorizationCredential } from '@core/authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Agent, IAgent } from '@domain/agent/agent';

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
    user.profile = await this.profileService.createProfile(
      userData.profileData
    );

    user.agent = await this.agentService.createAgent();

    // Need to save to get the object identifiers assigned
    const savedUser = await this.userRepository.save(user);
    this.logger.verbose?.(
      `Created a new user with id: ${savedUser.id}`,
      LogContext.COMMUNITY
    );

    // Ensure the user has the global registered credential
    if (!savedUser.agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${savedUser.id}`,
        LogContext.AUTH
      );
    await this.agentService.assignCredential({
      type: AuthorizationCredential.GlobalRegistered,
      agentID: savedUser.agent.id,
    });

    return savedUser;
  }

  async deleteUser(deleteData: DeleteUserInput): Promise<IUser> {
    const userID = deleteData.ID;
    const user = await this.getUserByIdOrFail(userID);
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
    if (!userData.email || userData.email.length == 0)
      throw new ValidationException(
        `User profile creation (${userData.firstName}) missing required email`,
        LogContext.COMMUNITY
      );
    const userCheck = await this.getUserByEmail(userData.email);
    if (userCheck)
      throw new ValidationException(
        `User profile with the specified email (${userData.email}) already exists`,
        LogContext.COMMUNITY
      );
    // Trim all values to remove space issues
    userData.email = userData.email.trim();
    return true;
  }

  async saveUser(user: IUser): Promise<IUser> {
    return await this.userRepository.save(user);
  }

  //Find a user either by id or email
  async getUserOrFail(
    userID: string,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    if (validator.isNumeric(userID)) {
      const idInt: number = parseInt(userID);
      return await this.getUserByIdOrFail(idInt, options);
    }

    return await this.getUserByEmailOrFail(userID, options);
  }

  async getUserByIdOrFail(
    userID: number,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    const user = await this.userRepository.findOne({ id: userID }, options);
    if (!user)
      throw new EntityNotFoundException(
        `Unable to find user with given ID: ${userID}`,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getUserByEmail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser | undefined> {
    return await this.userRepository.findOne({ email: email }, options);
  }

  async getUserByEmailOrFail(
    email: string,
    options?: FindOneOptions<User>
  ): Promise<IUser> {
    const user = await this.getUserByEmail(email, options);
    if (!user)
      throw new EntityNotFoundException(
        `Unable to find user with given email: ${email}`,
        LogContext.COMMUNITY
      );
    return user;
  }

  async getUserAndCredentials(
    userID: number
  ): Promise<{ user: IUser; credentials: ICredential[] }> {
    const user = await this.getUserByIdOrFail(userID, {
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
    userID: number
  ): Promise<{ user: IUser; agent: IAgent }> {
    const user = await this.getUserByIdOrFail(userID, {
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

  async getUserByIdWithAgent(userID: number): Promise<IUser> {
    const user = await this.getUserByIdOrFail(userID, {
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

    // Convert the data to json
    if (userInput.name) {
      user.name = userInput.name;
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

    await this.userRepository.save(user);

    // Check the tagsets
    if (userInput.profileData && user.profile) {
      await this.profileService.updateProfile(userInput.profileData);
    }

    const populatedUser = await this.getUserByIdOrFail(user.id);

    return populatedUser;
  }

  async getAgent(user: IUser): Promise<IAgent> {
    const userWithAgent = await this.getUserByIdOrFail(user.id, {
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
        const user = await this.getUserByIdOrFail(userID, {
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

  // Membership related functionality

  addGroupToEntity(
    entities: IGroupable[],
    entity: IGroupable,
    group: IUserGroup
  ) {
    const existingEntity = entities.find(e => e.id === entity.id);
    if (!existingEntity) {
      //first time through
      entities.push(entity);
      entity.groups = [group];
    } else {
      existingEntity.groups?.push(group);
    }
  }
}
