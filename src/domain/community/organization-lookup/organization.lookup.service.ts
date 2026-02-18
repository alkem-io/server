import { ActorType, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CredentialsSearchInput } from '@domain/actor/credential/dto/credentials.dto.search';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IOrganization, Organization } from '@domain/community/organization';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions } from 'typeorm';

export class OrganizationLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private actorLookupService: ActorLookupService
  ) {}

  async getOrganizationById(
    orgId: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    return this.entityManager.findOne(Organization, {
      ...options,
      where: { ...options?.where, id: orgId },
    });
  }

  // Organization IS an Actor - credentials are directly on the entity
  async organizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IOrganization[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    return this.entityManager.find(Organization, {
      where: {
        credentials: {
          type: credentialCriteria.type,
          resourceID: credResourceID,
        },
      },
      take: limit,
    });
  }

  /**
   * Count organizations with a given credential.
   * Wraps ActorLookupService.countActorsWithCredentials with ORGANIZATION type filter.
   */
  async countOrganizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    return this.actorLookupService.countActorsWithCredentials(
      credentialCriteria,
      [ActorType.ORGANIZATION]
    );
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

  async getOrganizationByIdOrFail(
    orgId: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization> {
    const organization = await this.getOrganizationById(orgId, options);
    if (!organization) {
      throw new EntityNotFoundException(
        'Organization not found',
        LogContext.COMMUNITY,
        { orgId }
      );
    }
    return organization;
  }

  /**
   * Get the account ID for an organization without loading the full entity.
   * Use when you only need the accountID.
   */
  async getOrganizationAccountIdOrFail(orgId: string): Promise<string> {
    const organization = await this.entityManager.findOne(Organization, {
      where: { id: orgId },
      select: { id: true, accountID: true },
    });
    if (!organization) {
      throw new EntityNotFoundException(
        'Organization not found',
        LogContext.COMMUNITY,
        { orgId }
      );
    }
    return organization.accountID;
  }

  /**
   * Get authorization policy for an organization without loading the full entity.
   * Wraps ActorLookupService.getActorAuthorizationOrFail.
   */
  async getOrganizationAuthorizationOrFail(
    orgId: string
  ): Promise<IAuthorizationPolicy> {
    return this.actorLookupService.getActorAuthorizationOrFail(orgId);
  }
}
