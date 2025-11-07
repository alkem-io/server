import { EntityManager, FindOneOptions, In } from 'typeorm';
import { isUUID } from 'class-validator';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User } from '@domain/community/user/user.entity';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Credential, CredentialsSearchInput, ICredential } from '@domain/agent';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

export class ContributorLookupService {
  constructor(
    private userLookupService: UserLookupService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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
      relations: {
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
    const organizations = await this.entityManager.find(Organization, {
      where: {
        id: In(organizationsIDs),
      },
      relations: {
        agent: true,
      },
    });
    if (organizations.length > 0) {
      contributorsManagedByUser.push(...organizations);
    }

    // Get all the Accounts from the User directly or via Organizations the user manages
    const accountIDs: string[] = [];

    accountIDs.push(user.accountID);

    for (const organization of organizations) {
      accountIDs.push(organization.accountID);
    }

    // Finally, get all the virtual contributors managed by the accounts
    for (const accountID of accountIDs) {
      const virtualContributors =
        await this.getVirtualContributorsManagedByAccount(accountID);
      contributorsManagedByUser.push(...virtualContributors);
    }

    return contributorsManagedByUser;
  }

  private async getVirtualContributorsManagedByAccount(
    accountID: string
  ): Promise<IContributor[]> {
    const virtualContributors = await this.entityManager.find(
      VirtualContributor,
      {
        where: {
          account: {
            id: accountID,
          },
        },
      }
    );
    return virtualContributors;
  }

  async contributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    const userContributors: IContributor[] = await this.entityManager.find(
      User,
      {
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
      }
    );
    const organizationContributors = await this.entityManager.find(
      Organization,
      {
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
      }
    );

    const vcContributors = await this.entityManager.find(VirtualContributor, {
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
    let contributor: IContributor | null = await this.entityManager.findOne(
      User,
      {
        ...options,
        where: { ...options?.where, id: contributorID },
      }
    );
    if (!contributor) {
      contributor = await this.entityManager.findOne(Organization, {
        ...options,
        where: { ...options?.where, id: contributorID },
      });
    }
    if (!contributor) {
      contributor = await this.entityManager.findOne(VirtualContributor, {
        ...options,
        where: { ...options?.where, id: contributorID },
      });
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

  private async getCredentialsByTypeHeldByAgent(
    agentID: string,
    credentialTypes: AuthorizationCredential[]
  ): Promise<ICredential[]> {
    const hostedAccountCredentials = await this.entityManager.find(Credential, {
      where: {
        type: In(credentialTypes),
        agent: {
          id: agentID,
        },
      },
    });

    return hostedAccountCredentials;
  }
}
