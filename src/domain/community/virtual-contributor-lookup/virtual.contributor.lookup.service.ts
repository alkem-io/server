import { ActorType, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { RoleSetRoleWithParentCredentials } from '@domain/access/role-set/dto/role.set.dto.role.with.parent.credentials';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CredentialsSearchInput } from '@domain/actor/credential';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';

export class VirtualContributorLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(VirtualContributor)
    private virtualContributorRepository: Repository<VirtualContributor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private actorLookupService: ActorLookupService
  ) {}

  // Note: VirtualContributor now extends Actor and has credentials directly.
  // This method returns both the virtualContributor and the actorID/credentials.
  // Callers should prefer using virtualContributor.id and virtualContributor.credentials directly.
  public async getVirtualContributorAndActor(virtualID: string): Promise<{
    virtualContributor: IVirtualContributor;
    actorID: string;
    credentials: ICredential[];
  }> {
    const virtualContributor = await this.getVirtualContributorByIdOrFail(
      virtualID,
      {
        relations: { credentials: true },
      }
    );

    return {
      virtualContributor,
      actorID: virtualContributor.id,
      credentials: virtualContributor.credentials || [],
    };
  }

  async getVirtualContributorById(
    vcId: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor | null> {
    if (!isUUID(vcId)) {
      return null;
    }
    return this.entityManager.findOne(VirtualContributor, {
      ...options,
      where: { ...options?.where, id: vcId },
    });
  }

  async getVirtualContributorByIdOrFail(
    vcId: string,
    options?: FindOneOptions<VirtualContributor>
  ): Promise<IVirtualContributor> {
    const virtualContributor = await this.getVirtualContributorById(
      vcId,
      options
    );
    if (!virtualContributor) {
      throw new EntityNotFoundException(
        'VirtualContributor not found',
        LogContext.COMMUNITY,
        { vcId }
      );
    }
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
        'Unable to find VirtualContributor with NameID',
        LogContext.COMMUNITY,
        { virtualContributorNameID }
      );
    return virtualContributor;
  }

  // VirtualContributor IS an Actor - credentials are directly on the entity
  async virtualContributorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    limit?: number
  ): Promise<IVirtualContributor[]> {
    const credResourceID = credentialCriteria.resourceID || '';

    return this.entityManager.find(VirtualContributor, {
      where: {
        credentials: {
          type: credentialCriteria.type,
          resourceID: credResourceID,
        },
      },
      take: limit,
    });
  }

  public async getAccountOrFail(
    virtualContributorID: string
  ): Promise<IAccount | never> {
    const virtualContributorWithAccount =
      await this.getVirtualContributorByIdOrFail(virtualContributorID, {
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

  // VirtualContributor IS an Actor - credentials are directly on the entity
  public async getPaginatedAvailableEntryRoleVCs(
    entryRoleCredentials: RoleSetRoleWithParentCredentials,
    paginationArgs: PaginationArgs
  ): Promise<IPaginatedType<IVirtualContributor>> {
    const currentEntryRoleVCIds =
      await this.actorLookupService.getActorIDsWithCredential(
        entryRoleCredentials.role,
        [ActorType.VIRTUAL]
      );
    const qb = this.virtualContributorRepository
      .createQueryBuilder('virtual_contributor')
      .leftJoinAndSelect('virtual_contributor.authorization', 'authorization')
      .select();

    if (entryRoleCredentials.parentRoleSetRole) {
      // VirtualContributor IS an Actor - credentials are directly on the entity
      qb.leftJoin('virtual_contributor.credentials', 'credential')
        .addSelect(['credential.type', 'credential.resourceID'])
        .where('credential.type = :type')
        .andWhere('credential.resourceID = :resourceID')
        .setParameters({
          type: entryRoleCredentials.parentRoleSetRole.type,
          resourceID: entryRoleCredentials.parentRoleSetRole.resourceID,
        });
    }

    if (currentEntryRoleVCIds.length > 0) {
      const hasWhere =
        qb.expressionMap.wheres && qb.expressionMap.wheres.length > 0;

      qb[hasWhere ? 'andWhere' : 'where'](
        'NOT virtual_contributor.id IN (:...memberVirtualContributors)'
      ).setParameters({
        memberVirtualContributors: currentEntryRoleVCIds,
      });
    }

    return getPaginationResults(qb, paginationArgs);
  }

  /**
   * Get the account ID for a virtual contributor without loading the full entity.
   * Use when you only need the account ID.
   */
  async getVirtualContributorAccountIdOrFail(vcId: string): Promise<string> {
    const vc = await this.getVirtualContributorById(vcId, {
      relations: { account: true },
      select: { id: true, account: { id: true } },
    });
    if (!vc) {
      throw new EntityNotFoundException(
        'VirtualContributor not found',
        LogContext.COMMUNITY,
        { vcId }
      );
    }
    if (!vc.account) {
      throw new EntityNotInitializedException(
        'Virtual Contributor Account not initialized',
        LogContext.AUTH,
        { vcId }
      );
    }
    return vc.account.id;
  }

  /**
   * Get authorization policy for a virtual contributor without loading the full entity.
   * Wraps ActorLookupService.getActorAuthorizationOrFail.
   */
  async getVirtualContributorAuthorizationOrFail(
    vcId: string
  ): Promise<IAuthorizationPolicy> {
    return this.actorLookupService.getActorAuthorizationOrFail(vcId);
  }
}

export { VirtualContributorLookupService as VirtualActorLookupService };
