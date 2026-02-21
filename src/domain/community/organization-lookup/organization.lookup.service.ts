import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions } from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { IOrganization } from '../organization/organization.interface';

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
    return this.entityManager.findOne(Organization, {
      ...options,
      where: { ...options?.where, id: organizationID },
    });
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

    return this.entityManager.find(Organization, {
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
  }

  async countOrganizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';

    return this.entityManager.count(Organization, {
      where: {
        agent: {
          credentials: {
            type: credentialCriteria.type,
            resourceID: credResourceID,
          },
        },
      },
    });
  }

  getOrganizationByDomain(
    domain: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    return this.entityManager.findOne(Organization, {
      ...options,
      where: { ...options?.where, domain: domain },
    });
  }

  getOrganizationByNameId(
    organizationNameID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    return this.entityManager.findOne(Organization, {
      ...options,
      where: { ...options?.where, nameID: organizationNameID },
    });
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
