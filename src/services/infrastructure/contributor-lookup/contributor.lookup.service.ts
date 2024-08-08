import { EntityManager, FindOneOptions, In } from 'typeorm';
import { isUUID } from 'class-validator';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Credential, CredentialsSearchInput, ICredential } from '@domain/agent';
import {
  IVirtualContributor,
  VirtualContributor,
} from '@domain/community/virtual-contributor';
import { IOrganization, Organization } from '@domain/community/organization';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';

export class ContributorLookupService {
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

  public async getUserByUuidOrFail(
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

  async getOrganizationByNameIdOrFail(
    organizationNameID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization> {
    const organization: IOrganization | null = await this.entityManager.findOne(
      Organization,
      {
        ...options,
        where: { ...options?.where, nameID: organizationNameID },
      }
    );
    if (!organization)
      throw new EntityNotFoundException(
        `Unable to find Organization with NameID: ${organizationNameID}`,
        LogContext.COMMUNITY
      );
    return organization;
  }

  async getVirtualContributorByNameIdOrFail(
    virtualContributorNameID: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor> {
    const virtualContributor: IVirtualContributor | null =
      await this.entityManager.findOne(VirtualContributor, {
        ...options,
        where: { ...options?.where, nameID: virtualContributorNameID },
      });
    if (!virtualContributor)
      throw new EntityNotFoundException(
        `Unable to find VirtualContributor with NameID: ${virtualContributorNameID}`,
        LogContext.COMMUNITY
      );
    return virtualContributor;
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

  // TODO: this may be heavy, is there a better way to do this?
  // Note: this logic should be reworked when the Account relationship to User / Organization is resolved
  public async getContributorsManagedByUser(
    userID: string
  ): Promise<IContributor[]> {
    const contributorsManagedByUser: IContributor[] = [];
    const user = await this.getUserByUuidOrFail(userID, {
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
    const organiationOwnerCredentials =
      await this.getCredentialsByTypeHeldByAgent(user.agent.id, [
        AuthorizationCredential.ORGANIZATION_OWNER,
        AuthorizationCredential.ORGANIZATION_ADMIN,
      ]);
    const organizationsIDs = organiationOwnerCredentials.map(
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
    const userAccountHostCredentials =
      await this.getCredentialsByTypeHeldByAgent(user.agent.id, [
        AuthorizationCredential.ACCOUNT_HOST,
      ]);
    userAccountHostCredentials.forEach(credential =>
      accountIDs.push(credential.resourceID)
    );
    for (const organization of organizations) {
      const orgAccountHostCredentials =
        await this.getCredentialsByTypeHeldByAgent(organization.agent.id, [
          AuthorizationCredential.ACCOUNT_HOST,
        ]);
      orgAccountHostCredentials.forEach(credential =>
        accountIDs.push(credential.resourceID)
      );
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

  public getContributorType(contributor: IContributor) {
    if (contributor instanceof User) return CommunityContributorType.USER;
    if (contributor instanceof Organization)
      return CommunityContributorType.ORGANIZATION;
    if (contributor instanceof VirtualContributor)
      return CommunityContributorType.VIRTUAL;
    throw new RelationshipNotFoundException(
      `Unable to determine contributor type for ${contributor.id}`,
      LogContext.COMMUNITY
    );
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
