import { EntityManager, FindOneOptions } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CredentialsSearchInput, IAgent } from '@domain/agent';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';

export class VirtualContributorLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getVirtualContributorAndAgent(
    virtualID: string
  ): Promise<{ virtualContributor: IVirtualContributor; agent: IAgent }> {
    const virtualContributor = await this.getVirtualContributorOrFail(
      virtualID,
      {
        relations: { agent: true },
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
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor> {
    const virtualContributor: IVirtualContributor | null =
      await this.entityManager.findOne(VirtualContributor, {
        ...options,
        where: { ...options?.where, id: virtualContributorID },
      });
    if (!virtualContributor)
      throw new EntityNotFoundException(
        `Unable to find VirtualContributor with ID: ${virtualContributorID}`,
        LogContext.COMMUNITY
      );
    return virtualContributor;
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

  async virtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IVirtualContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';

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

    return vcContributors;
  }

  public async getAccountOrFail(
    virtualContributorID: string
  ): Promise<IAccount | never> {
    const virtualContributorWithAccount =
      await this.getVirtualContributorOrFail(virtualContributorID, {
        relations: { account: true },
      });
    const account = virtualContributorWithAccount.account;
    if (!account)
      throw new EntityNotInitializedException(
        `Virtual Contributor Account not initialized: ${virtualContributorID}`,
        LogContext.AUTH
      );
    return account;
  }
}
