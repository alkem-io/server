import { EntityManager, FindOneOptions, In, FindManyOptions } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';

export class UserLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getUserByUUID(
    userID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        id: userID,
      },
      ...options,
    });

    return user;
  }

  public async getUserByAgentId(
    agentID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        agent: {
          id: agentID,
        },
      },
      relations: {
        agent: true,
        ...options?.relations,
      },
      ...options,
    });

    return user;
  }

  public async getUsersByUUID(
    userIDs: string[],
    options?: FindManyOptions<User> | undefined
  ): Promise<IUser[]> {
    const users: IUser[] = await this.entityManager.find(User, {
      where: {
        id: In(userIDs),
      },
      ...options,
    });

    return users;
  }

  public async getUserByEmail(
    email: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        email: email,
      },
      ...options,
    });

    return user;
  }

  public async getUserByAuthenticationID(
    authenticationID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        authenticationID: authenticationID,
      },
      ...options,
    });

    return user;
  }

  public async getUserByNameIdOrFail(
    userNameID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        nameID: userNameID,
      },
      ...options,
    });
    if (!user) {
      throw new EntityNotFoundException(
        `User with nameId ${userNameID} not found`,
        LogContext.COMMUNITY
      );
    }
    return user;
  }

  async isRegisteredUser(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (user) return true;
    return false;
  }

  public async getUserOrFail(
    userID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser> {
    const user = await this.getUserByUUID(userID, options);
    if (!user) {
      throw new EntityNotFoundException(
        `User with id ${userID} not found`,
        LogContext.COMMUNITY
      );
    }
    return user;
  }

  async usersWithCredential(
    credentialCriteria: CredentialsSearchInput,
    limit?: number,
    options?: FindManyOptions<User>
  ): Promise<IUser[]> {
    return this.usersWithCredentials([credentialCriteria], limit, options);
  }

  async usersWithCredentials(
    credentialCriteriaArray: CredentialsSearchInput[],
    limit?: number,
    options?: FindManyOptions<User>
  ): Promise<IUser[]> {
    if (credentialCriteriaArray.length === 0) {
      return [];
    }

    // Build OR conditions for multiple credential criteria
    const whereConditions = credentialCriteriaArray.map(criteria => ({
      agent: {
        credentials: {
          type: criteria.type,
          resourceID: criteria.resourceID || '',
        },
      },
    }));

    const findOptions: FindManyOptions<User> = {
      where: whereConditions,
      relations: {
        agent: {
          credentials: true,
        },
        ...options?.relations,
      },
      take: limit,
      ...options,
    };

    // Merge relations properly to avoid overriding the agent.credentials relation
    if (options?.relations) {
      findOptions.relations = {
        ...findOptions.relations,
        ...options.relations,
        agent: {
          credentials: true,
          ...(options.relations as any)?.agent,
        },
      };
    }

    const users = await this.entityManager.find(User, findOptions);

    return users;
  }

  public async countUsersWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';

    const usersCount = await this.entityManager.count(User, {
      where: {
        agent: {
          credentials: {
            type: credentialCriteria.type,
            resourceID: credResourceID,
          },
        },
      },
    });
    return usersCount;
  }

  public async getUsersWithAgent(ids: string[]): Promise<IUser[]> {
    const users = await this.entityManager.find(User, {
      where: {
        id: In(ids),
      },
      relations: {
        agent: true,
      },
    });
    return users;
  }

  public async getUserAndCredentials(
    userID: string
  ): Promise<{ user: IUser; credentials: ICredential[] }> {
    const user = await this.getUserOrFail(userID, {
      relations: { agent: true },
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
      relations: { agent: true },
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
      relations: {
        agent: {
          credentials: true,
        },
      },
    });

    if (!user.agent || !user.agent.credentials) {
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${userID}`,
        LogContext.AUTH
      );
    }
    return user;
  }
}
