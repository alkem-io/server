import { ActorType, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  UserAlreadyRegisteredException,
} from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { CredentialsSearchInput } from '@domain/actor/credential/dto/credentials.dto.search';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  In,
} from 'typeorm';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';

// Utility function for checking Alkemio team email - can be used directly when email is available
export const isAlkemioEmail = (email: string): boolean =>
  /.*@alkem\.io/.test(email);

export class UserLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private actorLookupService: ActorLookupService
  ) {}

  public async getUserById(
    userId: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    if (!isUUID(userId)) {
      return null;
    }

    return this.entityManager.findOne(User, {
      where: { id: userId },
      ...options,
    });
  }

  public async getUsersByIds(
    userIds: string[],
    options?: FindManyOptions<User> | undefined
  ): Promise<IUser[]> {
    const validIds = userIds.filter(id => isUUID(id));
    if (validIds.length === 0) {
      return [];
    }

    return this.entityManager.find(User, {
      where: { id: In(validIds) },
      ...options,
    });
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
        actor: { nameID: userNameID },
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

  public async getUserByIdOrFail(
    userId: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser> {
    const user = await this.getUserById(userId, options);
    if (!user) {
      throw new EntityNotFoundException(
        'User not found',
        LogContext.COMMUNITY,
        { userId }
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
    // User has credentials via actor relation
    const whereConditions = credentialCriteriaArray.map(criteria => ({
      actor: {
        credentials: {
          type: criteria.type,
          resourceID: criteria.resourceID || '',
        },
      },
    }));

    const optionsRelations: FindOptionsRelations<User> | undefined =
      options?.relations as FindOptionsRelations<User> | undefined;

    const actorSubRelations =
      typeof optionsRelations?.actor === 'object'
        ? optionsRelations.actor
        : undefined;

    const findOptions: FindManyOptions<User> = {
      ...options,
      where: whereConditions,
      relations: {
        ...optionsRelations,
        actor: {
          credentials: true,
          ...actorSubRelations,
        },
      },
      take: limit ?? options?.take,
    };

    return this.entityManager.find(User, findOptions);
  }

  /**
   * Count users with a given credential.
   * Wraps ActorLookupService.countActorsWithCredentials with USER type filter.
   */
  public async countUsersWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    return this.actorLookupService.countActorsWithCredentials(
      credentialCriteria,
      [ActorType.USER]
    );
  }

  // Credentials are loaded via the actor relation
  public async getUsersWithCredentials(ids: string[]): Promise<IUser[]> {
    const users = await this.entityManager.find(User, {
      where: {
        id: In(ids),
      },
      relations: {
        actor: { credentials: true },
      },
    });
    return users;
  }

  public async getUserAndCredentials(
    userId: string
  ): Promise<{ user: IUser; credentials: ICredential[] }> {
    const user = await this.getUserByIdOrFail(userId, {
      relations: { actor: { credentials: true } },
    });

    if (!user.credentials) {
      throw new EntityNotInitializedException(
        'User credentials not initialized',
        LogContext.AUTH,
        { userId }
      );
    }
    return { user, credentials: user.credentials };
  }

  public async isFromAlkemioTeam(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }
    const user = await this.getUserById(userId);
    if (!user?.email) {
      return false;
    }
    return /.*@alkem\.io/.test(user.email);
  }

  /**
   * Get authorization policy for a user without loading the full entity.
   * Wraps ActorLookupService.getActorAuthorizationOrFail.
   */
  public async getUserAuthorizationOrFail(
    userId: string
  ): Promise<IAuthorizationPolicy> {
    return this.actorLookupService.getActorAuthorizationOrFail(userId);
  }

  /**
   * Links a Kratos authenticationID to an existing user.
   * Used when a new Kratos identity is created for an email that already has
   * an Alkemio user profile (e.g. seeded admin accounts).
   */
  public async linkAuthenticationID(
    user: IUser,
    authenticationID: string
  ): Promise<IUser> {
    // Ensure the authenticationID is not already linked to another user
    const existingUser = await this.getUserByAuthenticationID(authenticationID);
    if (existingUser && existingUser.id !== user.id) {
      throw new UserAlreadyRegisteredException(
        'Kratos identity already linked to another user'
      );
    }

    user.authenticationID = authenticationID;
    const saved = await this.entityManager.save(User, user as User);

    this.logger.verbose?.(
      `Linked authenticationID ${authenticationID} to existing user ${user.id}`,
      LogContext.AUTH
    );

    return saved;
  }
}
