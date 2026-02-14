import { SYSTEM_ACTOR_IDS } from '@common/constants/system.actor.ids';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { Credential, CredentialsSearchInput, ICredential } from '@domain/agent';
import { credentials } from '@domain/agent/credential/credential.schema';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Organization } from '@domain/community/organization/organization.entity';
import { organizations } from '@domain/community/organization/organization.schema';
import { User } from '@domain/community/user/user.entity';
import { users } from '@domain/community/user/user.schema';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { Inject, LoggerService } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, and, inArray } from 'drizzle-orm';
type FindOneOptions<_T> = { with?: Record<string, any> };

export class ContributorLookupService {
  constructor(
    private userLookupService: UserLookupService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  // TODO: this may be heavy, is there a better way to do this?
  // Note: this logic should be reworked when the Account relationship to User / Organization is resolved
  public async getContributorsManagedByUser(
    userID: string
  ): Promise<IContributor[]> {
    const contributorsManagedByUser: IContributor[] = [];
    const user = await this.userLookupService.getUserOrFail(userID, {
      with: {
        agent: true,
      },
    });
    if (!user.agent) {
      throw new EntityNotFoundException(
        `User with id ${userID} could not load the agent`,
        LogContext.COMMUNITY
      );
    }

    // Obviously this user managed itself :)
    contributorsManagedByUser.push(user);

    // Get all the organizations managed by the User
    const organizationOwnerCredentials =
      await this.getCredentialsByTypeHeldByAgent(user.agent.id, [
        AuthorizationCredential.ORGANIZATION_OWNER,
        AuthorizationCredential.ORGANIZATION_ADMIN,
      ]);
    const organizationsIDs = organizationOwnerCredentials.map(
      credential => credential.resourceID
    );
    const managedOrganizations = (await this.db.query.organizations.findMany({
      where: inArray(organizations.id, organizationsIDs),
      with: {
        agent: true,
      },
    })) as unknown as Organization[];
    if (managedOrganizations.length > 0) {
      contributorsManagedByUser.push(...managedOrganizations);
    }

    // Get all the Accounts from the User directly or via Organizations the user manages
    const accountIDs: string[] = [];

    accountIDs.push(user.accountID);

    for (const organization of managedOrganizations) {
      accountIDs.push(organization.accountID);
    }

    // Finally, get all the virtual contributors managed by the accounts
    for (const accountID of accountIDs) {
      const vcs =
        await this.getVirtualContributorsManagedByAccount(accountID);
      contributorsManagedByUser.push(...vcs);
    }

    return contributorsManagedByUser;
  }

  private async getVirtualContributorsManagedByAccount(
    accountID: string
  ): Promise<IContributor[]> {
    const vcs = await this.db.query.virtualContributors.findMany(
      {
        where: eq(virtualContributors.accountId, accountID),
      }
    );
    return vcs as unknown as IContributor[];
  }

  async contributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    const userContributors: IContributor[] = (await this.db.query.users.findMany(
      {
        where: (user, { exists }) =>
          exists(
            this.db
              .select()
              .from(credentials)
              .where(
                and(
                  eq(credentials.agentId, user.agentId),
                  eq(credentials.type, credentialCriteria.type),
                  eq(credentials.resourceID, credResourceID)
                )
              )
          ),
        with: {
          agent: {
            with: {
              credentials: true,
            },
          },
        },
        limit,
      }
    )) as unknown as IContributor[];

    const organizationContributors = (await this.db.query.organizations.findMany(
      {
        where: (org, { exists }) =>
          exists(
            this.db
              .select()
              .from(credentials)
              .where(
                and(
                  eq(credentials.agentId, org.agentId),
                  eq(credentials.type, credentialCriteria.type),
                  eq(credentials.resourceID, credResourceID)
                )
              )
          ),
        with: {
          agent: {
            with: {
              credentials: true,
            },
          },
        },
        limit,
      }
    )) as unknown as IContributor[];

    const vcContributors = (await this.db.query.virtualContributors.findMany({
      where: (vc, { exists }) =>
        exists(
          this.db
            .select()
            .from(credentials)
            .where(
              and(
                eq(credentials.agentId, vc.agentId),
                eq(credentials.type, credentialCriteria.type),
                eq(credentials.resourceID, credResourceID)
              )
            )
        ),
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
      limit,
    })) as unknown as IContributor[];

    return userContributors
      .concat(organizationContributors)
      .concat(vcContributors);
  }

  async getContributorByUUID(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | null> {
    if (!isUUID(contributorID)) {
      throw new InvalidUUID('Invalid UUID provided!', LogContext.COMMUNITY, {
        provided: contributorID,
      });
    }
    let contributor: IContributor | null =
      (await this.db.query.users.findFirst({
        where: eq(users.id, contributorID),
        ...options,
      })) as unknown as IContributor | null;
    if (!contributor) {
      contributor = (await this.db.query.organizations.findFirst({
        where: eq(organizations.id, contributorID),
        ...options,
      })) as unknown as IContributor | null;
    }
    if (!contributor) {
      contributor = (await this.db.query.virtualContributors.findFirst({
        where: eq(virtualContributors.id, contributorID),
        ...options,
      })) as unknown as IContributor | null;
    }

    return contributor;
  }

  async getContributorByUuidOrFail(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | never> {
    const contributor = await this.getContributorByUUID(contributorID, options);
    if (!contributor)
      throw new EntityNotFoundException(
        `Unable to find Contributor with ID: ${contributorID}`,
        LogContext.COMMUNITY
      );
    return contributor;
  }

  /**
   * Finds a contributor (User, Organization, or VirtualContributor) by their agent ID.
   * @param agentId The ID of the agent associated with the contributor
   * @param options Optional TypeORM find options (e.g., relations)
   * @returns The contributor if found, null otherwise
   */
  async getContributorByAgentId(
    agentId: string,
    options?: Omit<FindOneOptions<User>, 'where'>
  ): Promise<IContributor | null> {
    if (SYSTEM_ACTOR_IDS.has(agentId)) {
      return null;
    }

    if (!isUUID(agentId)) {
      throw new InvalidUUID(
        'Invalid UUID provided for agent ID!',
        LogContext.COMMUNITY,
        {
          provided: agentId,
        }
      );
    }

    let contributor: IContributor | null =
      (await this.db.query.users.findFirst({
        where: eq(users.agentId, agentId),
        ...options,
      })) as unknown as IContributor | null;
    contributor ??= (await this.db.query.organizations.findFirst({
      where: eq(organizations.agentId, agentId),
      ...options,
    })) as unknown as IContributor | null;
    contributor ??= (await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.agentId, agentId),
      ...options,
    })) as unknown as IContributor | null;

    return contributor;
  }

  /**
   * Finds a User by their agent ID.
   * @param agentId The ID of the agent associated with the user
   * @returns The user ID if found, undefined otherwise
   */
  async getUserIdByAgentId(agentId: string): Promise<string | undefined> {
    if (!isUUID(agentId)) {
      return undefined;
    }

    const userData = await this.db.query.users.findFirst({
      where: eq(users.agentId, agentId),
      columns: {
        id: true,
      },
    });

    return userData?.id;
  }

  private async getCredentialsByTypeHeldByAgent(
    agentID: string,
    credentialTypes: AuthorizationCredential[]
  ): Promise<ICredential[]> {
    const hostedAccountCredentials = await this.db.query.credentials.findMany({
      where: and(
        inArray(credentials.type, credentialTypes),
        eq(credentials.agentId, agentID)
      ),
    });

    return hostedAccountCredentials as unknown as ICredential[];
  }
}
