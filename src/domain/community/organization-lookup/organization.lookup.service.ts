import { EntityManager, FindOneOptions } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Organization } from '../organization/organization.entity';
import { IOrganization } from '../organization/organization.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { IAgent } from '@domain/agent/agent/agent.interface';

export class OrganizationLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getOrganizationByUUID(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    const organization: IOrganization | null = await this.entityManager.findOne(
      Organization,
      {
        ...options,
        where: { ...options?.where, id: organizationID },
      }
    );

    return organization;
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

    const organizations = await this.entityManager.find(Organization, {
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

    return organizations;
  }

  async countOrganizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';

    const orgContributorsCount = await this.entityManager.count(Organization, {
      where: {
        agent: {
          credentials: {
            type: credentialCriteria.type,
            resourceID: credResourceID,
          },
        },
      },
    });
    return orgContributorsCount;
  }

  async getOrganizationByDomain(
    domain: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    const organization: IOrganization | null = await this.entityManager.findOne(
      Organization,
      {
        ...options,
        where: { ...options?.where, domain: domain },
      }
    );

    return organization;
  }

  async getOrganizationByNameId(
    organizationNameID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    const organization: IOrganization | null = await this.entityManager.findOne(
      Organization,
      {
        ...options,
        where: { ...options?.where, nameID: organizationNameID },
      }
    );

    return organization;
  }

  async getOrganizationByNameIdOrFail(
    organizationNameID: string,
    options?: FindOneOptions<Organization>
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
    options?: FindOneOptions<Organization>
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
