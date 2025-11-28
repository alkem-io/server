import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
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
import { PaginationArgs } from '@core/pagination/pagination.args';
import { RoleSetRoleWithParentCredentials } from '@domain/access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';

export class VirtualContributorLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
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

  public async getPaginatedAvailableEntryRoleVCs(
    entryRoleCredentials: RoleSetRoleWithParentCredentials,
    paginationArgs: PaginationArgs
  ): Promise<IPaginatedType<IVirtualContributor>> {
    const currentEntryRoleVirtualContributors =
      await this.virtualContributorsWithCredentials(entryRoleCredentials.role);
    const qb = this.virtualContributorRepository
      .createQueryBuilder('virtual_contributor')
      .leftJoinAndSelect('virtual_contributor.authorization', 'authorization')
      .select();

    if (entryRoleCredentials.parentRoleSetRole) {
      qb.leftJoin('virtual_contributor.agent', 'agent')
        .leftJoin('agent.credentials', 'credential')
        .addSelect(['credential.type', 'credential.resourceID'])
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: entryRoleCredentials.parentRoleSetRole.type,
          resourceID: entryRoleCredentials.parentRoleSetRole.resourceID,
        });
    }

    if (currentEntryRoleVirtualContributors.length > 0) {
      const hasWhere =
        qb.expressionMap.wheres && qb.expressionMap.wheres.length > 0;

      qb[hasWhere ? 'andWhere' : 'where'](
        'NOT virtual_contributor.id IN (:...memberVirtualContributors)'
      ).setParameters({
        memberVirtualContributors: currentEntryRoleVirtualContributors.map(
          virtualContributor => virtualContributor.id
        ),
      });
    }

    return getPaginationResults(qb, paginationArgs);
  }
}
