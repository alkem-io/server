import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { Inject, LoggerService } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { users } from '../user/user.schema';
import { credentials } from '@domain/agent/credential/credential.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { IUser } from '../user/user.interface';

type UserFindOptions = {
  loadEagerRelations?: boolean;
  with?: {
    agent?: boolean | { credentials?: boolean; authorization?: boolean };
    profile?: boolean | { authorization?: boolean };
    authorization?: boolean;
    settings?: boolean | { authorization?: boolean };
    storageAggregator?: boolean | { authorization?: boolean; directStorage?: boolean | { authorization?: boolean } };
  };
  select?: any;
};

export class UserLookupService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private buildWithClause(options?: UserFindOptions): Record<string, any> {
    const withClause: any = {};
    if (options?.with) {
      if (options.with.authorization) withClause.authorization = true;
      if (options.with.profile) {
        if (typeof options.with.profile === 'object') {
          const profileWith: any = {};
          if (options.with.profile.authorization) profileWith.authorization = true;
          withClause.profile = Object.keys(profileWith).length > 0 ? { with: profileWith } : true;
        } else {
          withClause.profile = true;
        }
      }
      if (options.with.agent) {
        if (typeof options.with.agent === 'object') {
          const agentWith: any = {};
          if (options.with.agent.credentials) agentWith.credentials = true;
          if (options.with.agent.authorization) agentWith.authorization = true;
          withClause.agent = Object.keys(agentWith).length > 0 ? { with: agentWith } : true;
        } else {
          withClause.agent = true;
        }
      }
      if (options.with.settings) {
        if (typeof options.with.settings === 'object') {
          const settingsWith: any = {};
          if (options.with.settings.authorization) settingsWith.authorization = true;
          withClause.settings = Object.keys(settingsWith).length > 0 ? { with: settingsWith } : true;
        } else {
          withClause.settings = true;
        }
      }
      if (options.with.storageAggregator) {
        if (typeof options.with.storageAggregator === 'object') {
          const saWith: any = {};
          if (options.with.storageAggregator.authorization) saWith.authorization = true;
          if (options.with.storageAggregator.directStorage) {
            if (typeof options.with.storageAggregator.directStorage === 'object') {
              const dsWith: any = {};
              if (options.with.storageAggregator.directStorage.authorization) dsWith.authorization = true;
              saWith.directStorage = Object.keys(dsWith).length > 0 ? { with: dsWith } : true;
            } else {
              saWith.directStorage = true;
            }
          }
          withClause.storageAggregator = Object.keys(saWith).length > 0 ? { with: saWith } : true;
        } else {
          withClause.storageAggregator = true;
        }
      }
    }
    return withClause;
  }

  public async getUserByUUID(
    userID: string,
    options?: UserFindOptions | undefined
  ): Promise<IUser | null> {
    if (!isUUID(userID)) {
      return null;
    }

    const withClause = this.buildWithClause(options);

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (user as unknown as IUser) ?? null;
  }

  public async getUserByAgentId(
    agentID: string,
    options?: UserFindOptions | undefined
  ): Promise<IUser | null> {
    const withClause = this.buildWithClause(options);
    // Always load agent for agent-based lookups
    if (!withClause.agent) {
      withClause.agent = true;
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.agentId, agentID),
      with: withClause,
    });

    return (user as unknown as IUser) ?? null;
  }

  public async getUsersByUUID(
    userIDs: string[],
    options?: UserFindOptions | undefined
  ): Promise<IUser[]> {
    const validUUIDs = userIDs.filter(id => isUUID(id));
    if (validUUIDs.length === 0) {
      return [];
    }

    const withClause = this.buildWithClause(options);

    const foundUsers = await this.db.query.users.findMany({
      where: inArray(users.id, validUUIDs),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return foundUsers as unknown as IUser[];
  }

  public async getUserByEmail(
    email: string,
    options?: UserFindOptions | undefined
  ): Promise<IUser | null> {
    const withClause = this.buildWithClause(options);

    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (user as unknown as IUser) ?? null;
  }

  public async getUserByAuthenticationID(
    authenticationID: string,
    options?: UserFindOptions | undefined
  ): Promise<IUser | null> {
    const withClause = this.buildWithClause(options);

    const user = await this.db.query.users.findFirst({
      where: eq(users.authenticationID, authenticationID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (user as unknown as IUser) ?? null;
  }

  public async getUserByNameIdOrFail(
    userNameID: string,
    options?: UserFindOptions | undefined
  ): Promise<IUser> {
    const withClause = this.buildWithClause(options);

    const user = await this.db.query.users.findFirst({
      where: eq(users.nameID, userNameID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    if (!user) {
      throw new EntityNotFoundException(
        `User with nameId ${userNameID} not found`,
        LogContext.COMMUNITY
      );
    }
    return user as unknown as IUser;
  }

  async isRegisteredUser(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (user) return true;
    return false;
  }

  public async getUserOrFail(
    userID: string,
    options?: UserFindOptions | undefined
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
    options?: UserFindOptions
  ): Promise<IUser[]> {
    return this.usersWithCredentials([credentialCriteria], limit, options);
  }

  async usersWithCredentials(
    credentialCriteriaArray: CredentialsSearchInput[],
    limit?: number,
    _options?: UserFindOptions
  ): Promise<IUser[]> {
    if (credentialCriteriaArray.length === 0) {
      return [];
    }

    // Build OR conditions using SQL for credential-based lookups
    const conditions = credentialCriteriaArray.map(criteria => {
      const credResourceID = criteria.resourceID || '';
      return and(
        eq(credentials.type, criteria.type),
        eq(credentials.resourceID, credResourceID)
      );
    });

    // Use a join-based query to find users matching credential criteria
    const condition = conditions.length === 1
      ? conditions[0]
      : sql`(${sql.join(conditions.map(c => sql`(${c})`), sql` OR `)})`;

    const matchingUserIds = await this.db
      .selectDistinct({ userId: users.id })
      .from(users)
      .innerJoin(agents, eq(users.agentId, agents.id))
      .innerJoin(credentials, eq(agents.id, credentials.agentId))
      .where(condition!)
      .limit(limit ?? 10000);

    if (matchingUserIds.length === 0) {
      return [];
    }

    const userIds = matchingUserIds.map(r => r.userId);
    const foundUsers = await this.db.query.users.findMany({
      where: inArray(users.id, userIds),
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
    });

    return foundUsers as unknown as IUser[];
  }

  public async countUsersWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';

    const result = await this.db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(agents, eq(users.agentId, agents.id))
      .innerJoin(credentials, eq(agents.id, credentials.agentId))
      .where(
        and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credResourceID)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  public async getUsersWithAgent(ids: string[]): Promise<IUser[]> {
    const foundUsers = await this.db.query.users.findMany({
      where: inArray(users.id, ids),
      with: {
        agent: true,
      },
    });
    return foundUsers as unknown as IUser[];
  }

  public async getUserAndCredentials(
    userID: string
  ): Promise<{ user: IUser; credentials: ICredential[] }> {
    const user = await this.getUserOrFail(userID, {
      with: { agent: { credentials: true } },
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
      with: { agent: true },
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
      with: {
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
