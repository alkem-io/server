import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, In } from 'typeorm';
import { IContributor } from './contributor.interface';
import { User } from '../user';
import { Organization } from '../organization';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { VirtualContributor } from '../virtual-contributor';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IAccount } from '@domain/space/account/account.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { AuthorizationCredential } from '@common/enums';
import { Account } from '@domain/space/account/account.entity';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

@Injectable()
export class ContributorService {
  constructor(
    private contributorLookupService: ContributorLookupService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async contributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IContributor[]> {
    return await this.contributorLookupService.contributorsWithCredentials(
      credentialCriteria,
      limit
    );
  }

  async getContributor(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | null> {
    return await this.contributorLookupService.getContributor(
      contributorID,
      options
    );
  }

  async getContributorOrFail(
    contributorID: string,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor | never> {
    const contributor = await this.getContributor(contributorID, options);
    if (!contributor)
      throw new EntityNotFoundException(
        `Unable to find Contributor with ID: ${contributorID}`,
        LogContext.COMMUNITY
      );
    return contributor;
  }

  async getContributorAndAgent(
    contributorID: string
  ): Promise<{ contributor: IContributor; agent: IAgent }> {
    const contributor = await this.getContributorOrFail(contributorID, {
      relations: { agent: true },
    });

    if (!contributor.agent) {
      throw new EntityNotInitializedException(
        `Contributor Agent not initialized: ${contributorID}`,
        LogContext.AUTH
      );
    }
    return { contributor: contributor, agent: contributor.agent };
  }

  public getContributorType(contributor: IContributor) {
    return this.contributorLookupService.getContributorType(contributor);
  }

  // A utility method to load fields that are known by the Contributor type if not already
  public async getContributorWithRelations(
    contributor: IContributor,
    options?: FindOneOptions<IContributor>
  ): Promise<IContributor> {
    const type = this.getContributorType(contributor);
    let contributorWithRelations: IContributor | null = null;
    switch (type) {
      case CommunityContributorType.USER:
        contributorWithRelations = await this.entityManager.findOne(User, {
          ...options,
          where: { ...options?.where, id: contributor.id },
        });
        break;
      case CommunityContributorType.ORGANIZATION:
        contributorWithRelations = await this.entityManager.findOne(
          Organization,
          {
            ...options,
            where: { ...options?.where, id: contributor.id },
          }
        );
        break;
      case CommunityContributorType.VIRTUAL:
        contributorWithRelations = await this.entityManager.findOne(
          VirtualContributor,
          {
            ...options,
            where: { ...options?.where, id: contributor.id },
          }
        );
        break;
    }
    if (!contributorWithRelations) {
      throw new RelationshipNotFoundException(
        `Unable to determine contributor type for ${contributor.id}`,
        LogContext.COMMUNITY
      );
    }
    return contributorWithRelations;
  }

  public async getAccountsHostedByContributor(
    contributor: IContributor
  ): Promise<IAccount[]> {
    let agent = contributor.agent;
    if (!agent) {
      const contributorWithAgent = await this.getContributorWithRelations(
        contributor,
        {
          relations: { agent: true },
        }
      );
      agent = contributorWithAgent.agent;
    }
    const hostedAccountCredentials = await this.entityManager.find(Credential, {
      where: {
        type: AuthorizationCredential.ACCOUNT_HOST,
        agent: {
          id: agent.id,
        },
      },
    });
    const accountIDs = hostedAccountCredentials.map(cred => cred.resourceID);
    const accounts = await this.entityManager.find(Account, {
      where: {
        id: In(accountIDs),
      },
    });

    return accounts;
  }
}
