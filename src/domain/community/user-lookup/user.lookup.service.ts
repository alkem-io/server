import { EntityManager, FindOneOptions, In } from 'typeorm';
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
    const user = await this.entityManager.findOneBy(User, {
      email: email,
    });
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

  async usersWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IUser[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    const users = await this.entityManager.find(User, {
      where: {
        agent: {
          credentials: {
            type: credentialCriteria.type,
            resourceID: credResourceID,
          },
        },
      },
      relations: {
        agent: {
          credentials: true,
        },
      },
      take: limit,
    });

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
      relations: { agent: true },
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
