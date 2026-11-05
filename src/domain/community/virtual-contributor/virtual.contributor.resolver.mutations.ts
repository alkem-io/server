import { A22_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  DeleteVirtualContributorInput,
  UpdateVirtualContributorInput,
  UpdateVirtualContributorPlatformSettingsInput,
  UpdateVirtualContributorSettingsInput,
} from './dto';
import { AdminUpdateVirtualContributorPromoteInput } from './dto/virtual.contributor.dto.admin.update.promote';
import { RefreshVirtualContributorBodyOfKnowledgeInput } from './dto/virtual.contributor.dto.refresh.body.of.knowledge';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';

@ObjectType('MigrateEmbeddings') // TODO: what is this about?
@InstrumentResolver()
@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly platformResourceAuditService: PlatformResourceAuditService
  ) {}

  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified VirtualContributor.',
  })
  async updateVirtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Args('virtualContributorData')
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        virtualContributorData.ID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtualContributor.authorization,
      AuthorizationPrivilege.UPDATE,
      `virtual contributor Update: ${virtualContributor.id}`
    );

    const updatedVirtualContributor =
      await this.virtualContributorService.updateVirtualContributor(
        virtualContributorData
      );

    // Reset authorization policy as updates may affect authorization (e.g. searchVisibility changes)
    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        updatedVirtualContributor
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.virtualContributorService.getVirtualContributorByIdOrFail(
      updatedVirtualContributor.id
    );
  }

  @Mutation(() => IVirtualContributor, {
    description: 'Updates one of the Setting on an Virtual Contributor',
  })
  async updateVirtualContributorSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData')
    settingsData: UpdateVirtualContributorSettingsInput
  ): Promise<IVirtualContributor> {
    let virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        settingsData.virtualContributorID,
        {
          relations: {
            account: true,
          },
        }
      );

    const accountAuthorization = virtualContributor.account?.authorization;
    if (!accountAuthorization) {
      throw new RelationshipNotFoundException(
        `Unable to load authorizing account for VC ${virtualContributor.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtualContributor.authorization,
      AuthorizationPrivilege.UPDATE,
      `virtualContributor settings update: ${virtualContributor.id}`
    );

    virtualContributor =
      await this.virtualContributorService.updateVirtualContributorSettings(
        virtualContributor,
        settingsData.settings
      );
    virtualContributor =
      await this.virtualContributorService.save(virtualContributor);
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset

    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.virtualContributorService.getVirtualContributorByIdOrFail(
      virtualContributor.id
    );
  }

  @Mutation(() => IVirtualContributor, {
    description:
      'Updates platform-level settings of a VirtualContributor (platform admins only).',
  })
  async updateVirtualContributorPlatformSettings(
    @CurrentActor() actorContext: ActorContext,
    @Args('settingsData')
    settingsData: UpdateVirtualContributorPlatformSettingsInput
  ): Promise<IVirtualContributor> {
    let virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        settingsData.virtualContributorID
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtualContributor.authorization,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `virtualContributor platform settings update: ${virtualContributor.id}`
    );

    virtualContributor =
      await this.virtualContributorService.updateVirtualContributorPlatformSettings(
        virtualContributor,
        settingsData.settings
      );

    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.virtualContributorService.getVirtualContributorByIdOrFail(
      virtualContributor.id
    );
  }

  /**
   * The platform-promote flag: promoted VCs are listed first on the
   * platform-wide VC listings (library, available-for-role-set picker).
   * Gated on the PLATFORM policy, not the VC's own, so the owning account
   * cannot promote its own VC. The flag is not part of any authorization
   * policy, so nothing is re-applied.
   */
  @Mutation(() => IVirtualContributor, {
    description:
      'Sets the platform-promote flag of a VirtualContributor. Platform Content Full Access or Platform License Manager only.',
  })
  async adminUpdateVirtualContributorPromote(
    @CurrentActor() actorContext: ActorContext,
    @Args('promoteData') promoteData: AdminUpdateVirtualContributorPromoteInput
  ): Promise<IVirtualContributor> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        promoteData.virtualContributorID
      );
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_PROMOTE_MANAGE,
      `adminUpdateVirtualContributorPromote: ${virtualContributor.id}`
    );

    const changed = virtualContributor.promote !== promoteData.promote;
    virtualContributor.promote = promoteData.promote;
    const saved = await this.virtualContributorService.save(virtualContributor);

    // Single-path surface: every call reaching here was authorized by
    // PLATFORM_PROMOTE_MANAGE. Re-applying the current value is accepted but
    // is not a change, so it is not audited.
    if (changed) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        A22_INTENDED_OWNERS,
        {
          resourceKind: 'virtual_contributor',
          resourceId: saved.id,
          promote: saved.promote,
          outcome: 'promote_changed',
        }
      );
    }

    return saved;
  }

  @Mutation(() => IVirtualContributor, {
    description: 'Deletes the specified VirtualContributor.',
  })
  async deleteVirtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        deleteData.ID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `delete virtual contributor: ${virtual.id}`
    );
    return await this.virtualContributorService.deleteVirtualContributor(
      deleteData.ID
    );
  }

  @Mutation(() => Boolean, {
    description:
      'Triggers a request to the backing AI Service to refresh the knowledge that is available to it.',
  })
  async refreshVirtualContributorBodyOfKnowledge(
    @CurrentActor() actorContext: ActorContext,
    @Args('refreshData')
    refreshData: RefreshVirtualContributorBodyOfKnowledgeInput
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Refresh body of knowledge mutation invoked for VC ${refreshData.virtualContributorID}`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    const virtual =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        refreshData.virtualContributorID
      );
    this.logger.verbose?.(
      `VC ${refreshData.virtualContributorID} found`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `refresh body of knowledge: ${virtual.id}`
    );
    return await this.virtualContributorService.refreshBodyOfKnowledge(
      virtual,
      actorContext
    );
  }
}
