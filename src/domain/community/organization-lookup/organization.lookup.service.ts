import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { organizations } from '../organization/organization.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { credentials } from '@domain/agent/credential/credential.schema';
import { IOrganization } from '../organization/organization.interface';

type OrganizationFindOptions = {
  relations?: {
    agent?: boolean | { credentials?: boolean; authorization?: boolean };
    profile?: boolean;
    authorization?: boolean;
    roleSet?: boolean;
    storageAggregator?: boolean;
    verification?: boolean;
  };
};

export class OrganizationLookupService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private buildWithClause(options?: OrganizationFindOptions): Record<string, any> {
    const withClause: any = {};
    if (options?.relations) {
      if (options.relations.authorization) withClause.authorization = true;
      if (options.relations.profile) withClause.profile = true;
      if (options.relations.agent) {
        if (typeof options.relations.agent === 'object') {
          const agentWith: any = {};
          if (options.relations.agent.credentials) agentWith.credentials = true;
          if (options.relations.agent.authorization) agentWith.authorization = true;
          withClause.agent = Object.keys(agentWith).length > 0 ? { with: agentWith } : true;
        } else {
          withClause.agent = true;
        }
      }
      if (options.relations.roleSet) withClause.roleSet = true;
      if (options.relations.storageAggregator) withClause.storageAggregator = true;
      if (options.relations.verification) withClause.verification = true;
    }
    return withClause;
  }

  async getOrganizationByUUID(
    organizationID: string,
    options?: OrganizationFindOptions
  ): Promise<IOrganization | null> {
    const withClause = this.buildWithClause(options);

    const organization = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, organizationID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (organization as unknown as IOrganization) ?? null;
  }

  async getOrganizationAndAgent(
    organizationID: string
  ): Promise<{ organization: IOrganization; agent: IAgent }> {
    const organization = await this.getOrganizationOrFail(organizationID, {
      relations: { agent: true },
    });

    if (!organization.agent) {
      throw new EntityNotInitializedException(
        `Organization Agent not initialized: ${organizationID}`,
        LogContext.AUTH
      );
    }
    return { organization: organization, agent: organization.agent };
  }

  async organizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IOrganization[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    const matchingOrgIds = await this.db
      .selectDistinct({ orgId: organizations.id })
      .from(organizations)
      .innerJoin(agents, eq(organizations.agentId, agents.id))
      .innerJoin(credentials, eq(agents.id, credentials.agentId))
      .where(
        and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credResourceID)
        )
      )
      .limit(limit ?? 10000);

    if (matchingOrgIds.length === 0) {
      return [];
    }

    const orgIds = matchingOrgIds.map(r => r.orgId);
    const foundOrgs = await this.db.query.organizations.findMany({
      where: inArray(organizations.id, orgIds),
      with: {
        agent: {
          with: {
            credentials: true,
          },
        },
      },
    });

    return foundOrgs as unknown as IOrganization[];
  }

  async countOrganizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';

    const result = await this.db
      .select({ count: sql<number>`count(distinct ${organizations.id})` })
      .from(organizations)
      .innerJoin(agents, eq(organizations.agentId, agents.id))
      .innerJoin(credentials, eq(agents.id, credentials.agentId))
      .where(
        and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credResourceID)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  async getOrganizationByDomain(
    domain: string,
    options?: OrganizationFindOptions
  ): Promise<IOrganization | null> {
    const withClause = this.buildWithClause(options);

    const organization = await this.db.query.organizations.findFirst({
      where: eq(organizations.domain, domain),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (organization as unknown as IOrganization) ?? null;
  }

  async getOrganizationByNameId(
    organizationNameID: string,
    options?: OrganizationFindOptions
  ): Promise<IOrganization | null> {
    const withClause = this.buildWithClause(options);

    const organization = await this.db.query.organizations.findFirst({
      where: eq(organizations.nameID, organizationNameID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (organization as unknown as IOrganization) ?? null;
  }

  async getOrganizationByNameIdOrFail(
    organizationNameID: string,
    options?: OrganizationFindOptions
  ): Promise<IOrganization> {
    const organization = await this.getOrganizationByNameId(
      organizationNameID,
      options
    );
    if (!organization)
      throw new EntityNotFoundException(
        `Unable to find Organization with NameID: ${organizationNameID}`,
        LogContext.COMMUNITY
      );
    return organization;
  }

  async getOrganizationOrFail(
    organizationID: string,
    options?: OrganizationFindOptions
  ): Promise<IOrganization | never> {
    const organization = await this.getOrganizationByUUID(
      organizationID,
      options
    );
    if (!organization)
      throw new EntityNotFoundException(
        `Unable to find Organization with ID: ${organizationID}`,
        LogContext.COMMUNITY
      );
    return organization;
  }
}
