import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions } from 'typeorm';
import { IContributor } from './contributor.interface';
import { User } from '../user';
import { Organization } from '../organization';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';

@Injectable()
export class ContributorService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

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

    return userContributors.concat(organizationContributors);
  }

  async getContributor(
    contributorID: string,
    options?: FindOneOptions<Organization | User>
  ): Promise<IContributor | null> {
    let contributor: IContributor | null;
    if (contributorID.length === UUID_LENGTH) {
      contributor = await this.entityManager.findOne(User, {
        ...options,
        where: { ...options?.where, id: contributorID },
      });
      if (!contributor) {
        contributor = await this.entityManager.findOne(Organization, {
          ...options,
          where: { ...options?.where, id: contributorID },
        });
      }
    } else {
      // look up based on nameID
      contributor = await this.entityManager.findOne(User, {
        ...options,
        where: { ...options?.where, nameID: contributorID },
      });
      if (!contributor) {
        contributor = await this.entityManager.findOne(Organization, {
          ...options,
          where: { ...options?.where, nameID: contributorID },
        });
      }
    }
    return contributor;
  }

  async getContributorOrFail(
    contributorID: string,
    options?: FindOneOptions<Organization | User>
  ): Promise<IContributor | never> {
    const contributor = await this.getContributor(contributorID, options);
    if (!contributor)
      throw new EntityNotFoundException(
        `Unable to find Contributor with ID: ${contributorID}`,
        LogContext.COMMUNITY
      );
    return contributor;
  }
}
