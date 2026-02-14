import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { RoleSetRoleWithParentCredentials } from '@domain/access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { CredentialsSearchInput, IAgent } from '@domain/agent';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, and, inArray, notInArray, sql } from 'drizzle-orm';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { credentials } from '@domain/agent/credential/credential.schema';

type VcFindOptions = {
  with?: {
    agent?: boolean | { credentials?: boolean };
    account?: boolean | {
      with?: {
        authorization?: boolean;
      };
    };
    authorization?: boolean;
    profile?: boolean;
  };
};

export class VirtualContributorLookupService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private buildWithClause(options?: VcFindOptions): Record<string, any> {
    const withClause: any = {};
    if (options?.with) {
      if (options.with.authorization) withClause.authorization = true;
      if (options.with.profile) withClause.profile = true;
      if (options.with.account) {
        if (typeof options.with.account === 'object') {
          const nested: any = {};
          if (options.with.account.with?.authorization) nested.authorization = true;
          withClause.account = Object.keys(nested).length > 0 ? { with: nested } : true;
        } else {
          withClause.account = true;
        }
      }
      if (options.with.agent) {
        if (typeof options.with.agent === 'object' && options.with.agent.credentials) {
          withClause.agent = { with: { credentials: true } };
        } else {
          withClause.agent = true;
        }
      }
    }
    return withClause;
  }

  public async getVirtualContributorAndAgent(
    virtualID: string
  ): Promise<{ virtualContributor: IVirtualContributor; agent: IAgent }> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      virtualID,
      {
        with: { agent: true },
      }
    );

    if (!virtualContributor.agent) {
      throw new EntityNotInitializedException(
        `Virtual Contributor Agent not initialized: ${virtualID}`,
        LogContext.AUTH
      );
    }
    return {
      virtualContributor: virtualContributor,
      agent: virtualContributor.agent,
    };
  }

  async getVirtualContributorOrFail(
    virtualContributorID: string,
    options?: VcFindOptions
  ): Promise<IVirtualContributor> {
    if (!isUUID(virtualContributorID)) {
      throw new EntityNotFoundException(
        `Unable to find VirtualContributor with ID: ${virtualContributorID}`,
        LogContext.COMMUNITY
      );
    }

    const withClause = this.buildWithClause(options);

    const virtualContributor = await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.id, virtualContributorID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    if (!virtualContributor)
      throw new EntityNotFoundException(
        'Unable to find VirtualContributor with ID',
        LogContext.COMMUNITY,
        { virtualContributorID }
      );
    return virtualContributor as unknown as IVirtualContributor;
  }

  async getVirtualContributorByAgentId(
    agentID: string,
    options?: VcFindOptions
  ): Promise<IVirtualContributor | null> {
    const withClause = this.buildWithClause(options);
    // Always load agent for agent-based lookups
    if (!withClause.agent) {
      withClause.agent = true;
    }

    const virtualContributor = await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.agentId, agentID),
      with: withClause,
    });
    return (virtualContributor as unknown as IVirtualContributor) ?? null;
  }

  async getVirtualContributorByAgentIdOrFail(
    agentID: string,
    options?: VcFindOptions
  ): Promise<IVirtualContributor> {
    const virtualContributor = await this.getVirtualContributorByAgentId(
      agentID,
      options
    );
    if (!virtualContributor) {
      throw new EntityNotFoundException(
        `Unable to find VirtualContributor with agent ID: ${agentID}`,
        LogContext.COMMUNITY
      );
    }
    return virtualContributor;
  }

  async getVirtualContributorByNameIdOrFail(
    virtualContributorNameID: string,
    options?: VcFindOptions
  ): Promise<IVirtualContributor> {
    const withClause = this.buildWithClause(options);

    const virtualContributor = await this.db.query.virtualContributors.findFirst({
      where: eq(virtualContributors.nameID, virtualContributorNameID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    if (!virtualContributor)
      throw new EntityNotFoundException(
        'Unable to find VirtualContributor with NameID',
        LogContext.COMMUNITY,
        { virtualContributorNameID }
      );
    return virtualContributor as unknown as IVirtualContributor;
  }

  async virtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IVirtualContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    const matchingVcIds = await this.db
      .selectDistinct({ vcId: virtualContributors.id })
      .from(virtualContributors)
      .innerJoin(agents, eq(virtualContributors.agentId, agents.id))
      .innerJoin(credentials, eq(agents.id, credentials.agentId))
      .where(
        and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credResourceID)
        )
      )
      .limit(limit ?? 10000);

    if (matchingVcIds.length === 0) {
      return [];
    }

    const vcIds = matchingVcIds.map(r => r.vcId);
    const foundVcs = await this.db.query.virtualContributors.findMany({
      where: inArray(virtualContributors.id, vcIds),
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
    });

    return foundVcs as unknown as IVirtualContributor[];
  }

  public async getAccountOrFail(
    virtualContributorID: string
  ): Promise<IAccount | never> {
    const virtualContributorWithAccount =
      await this.getVirtualContributorOrFail(virtualContributorID, {
        with: { account: true },
      });
    const account = virtualContributorWithAccount.account;
    if (!account)
      throw new EntityNotInitializedException(
        `Virtual Contributor Account not initialized: ${virtualContributorID}`,
        LogContext.AUTH
      );
    return account;
  }

  public async getPaginatedAvailableEntryRoleVCs(
    entryRoleCredentials: RoleSetRoleWithParentCredentials,
    paginationArgs: PaginationArgs
  ): Promise<IPaginatedType<IVirtualContributor>> {
    const currentEntryRoleVirtualContributors =
      await this.virtualContributorsWithCredentials(entryRoleCredentials.role);

    const conditions: any[] = [];

    if (entryRoleCredentials.parentRoleSetRole) {
      // Find VCs that have the parent role credential
      const parentRoleVcIds = await this.db
        .selectDistinct({ vcId: virtualContributors.id })
        .from(virtualContributors)
        .innerJoin(agents, eq(virtualContributors.agentId, agents.id))
        .innerJoin(credentials, eq(agents.id, credentials.agentId))
        .where(
          and(
            eq(credentials.type, entryRoleCredentials.parentRoleSetRole.type),
            eq(credentials.resourceID, entryRoleCredentials.parentRoleSetRole.resourceID ?? '')
          )
        );

      if (parentRoleVcIds.length === 0) {
        return {
          items: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
        } as unknown as IPaginatedType<IVirtualContributor>;
      }

      conditions.push(inArray(virtualContributors.id, parentRoleVcIds.map(r => r.vcId)));
    }

    if (currentEntryRoleVirtualContributors.length > 0) {
      conditions.push(
        notInArray(
          virtualContributors.id,
          currentEntryRoleVirtualContributors.map(vc => vc.id)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Simple offset/limit pagination
    const first = (paginationArgs as any)?.first ?? 25;
    const offset = (paginationArgs as any)?.after ? Number((paginationArgs as any).after) + 1 : 0;

    const items = await this.db.query.virtualContributors.findMany({
      where: whereClause,
      with: { authorization: true },
      limit: first + 1,
      offset: offset,
    });

    const hasNextPage = items.length > first;
    const resultItems = hasNextPage ? items.slice(0, first) : items;

    return {
      items: resultItems as unknown as IVirtualContributor[],
      pageInfo: {
        hasNextPage,
        hasPreviousPage: offset > 0,
      },
    } as unknown as IPaginatedType<IVirtualContributor>;
  }
}
