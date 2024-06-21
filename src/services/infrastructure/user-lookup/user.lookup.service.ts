import { EntityManager, FindOneOptions, In } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Credential, ICredential } from '@domain/agent';
import { VirtualContributor } from '@domain/community/virtual-contributor';
import { Organization } from '@domain/community/organization';

export class UserLookupService {
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
    let user: IUser | null = null;

    if (userID.length === UUID_LENGTH) {
      {
        user = await this.entityManager.findOne(User, {
          where: {
            id: userID,
          },
          ...options,
        });
      }
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

    // Get all the VCs hosted on accounts from the User
    const accountHostCredentials = await this.getCredentialsByTypeHeldByAgent(
      user.agent.id,
      AuthorizationCredential.ACCOUNT_HOST
    );
    const accountIDs = accountHostCredentials.map(
      credential => credential.resourceID
    );

    for (const accountID of accountIDs) {
      const virtualContributors = await this.getContributorsManagedByAccount(
        accountID
      );
      contributorsManagedByUser.push(...virtualContributors);
    }

    // Get all the organizations managed by the User
    const organiationOwnerCredentials =
      await this.getCredentialsByTypeHeldByAgent(
        user.agent.id,
        AuthorizationCredential.ACCOUNT_HOST
      );
    const organizationsIDs = organiationOwnerCredentials.map(
      credential => credential.resourceID
    );
    const organizations = await this.entityManager.find(Organization, {
      where: {
        id: In(organizationsIDs),
      },
    });
    if (organizations.length > 0) {
      contributorsManagedByUser.push(...organizations);
    }

    return contributorsManagedByUser;
  }

  private async getContributorsManagedByAccount(
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

  private async getCredentialsByTypeHeldByAgent(
    agentID: string,
    credentialType: AuthorizationCredential
  ): Promise<ICredential[]> {
    const hostedAccountCredentials = await this.entityManager.find(Credential, {
      where: {
        type: credentialType,
        agent: {
          id: agentID,
        },
      },
    });

    return hostedAccountCredentials;
  }
}
