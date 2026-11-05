import { A22_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { AdminUpdateInnovationPackPromoteInput } from './dto/innovation.pack.dto.admin.update.promote';
import { UpdateInnovationPackInput } from './dto/innovation.pack.dto.update';
import { DeleteInnovationPackInput } from './dto/innovationPack.dto.delete';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';

@InstrumentResolver()
@Resolver()
export class InnovationPackResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService,
    private readonly platformResourceAuditService: PlatformResourceAuditService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  /**
   * The platform-promote flag: promoted packs are listed first in the
   * Innovation Library. Gated on the PLATFORM policy, not the pack's own, so
   * the owning account cannot promote its own pack. The flag is not part of
   * any authorization policy, so nothing is re-applied.
   */
  @Mutation(() => IInnovationPack, {
    description:
      'Sets the platform-promote flag of an InnovationPack. Platform Content Full Access or Platform License Manager only.',
  })
  async adminUpdateInnovationPackPromote(
    @CurrentActor() actorContext: ActorContext,
    @Args('promoteData') promoteData: AdminUpdateInnovationPackPromoteInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        promoteData.innovationPackID
      );
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_PROMOTE_MANAGE,
      `adminUpdateInnovationPackPromote: ${innovationPack.id}`
    );

    innovationPack.promote = promoteData.promote;
    const saved = await this.innovationPackService.save(innovationPack);

    // Single-path surface: every call reaching here was authorized by
    // PLATFORM_PROMOTE_MANAGE. Every successful call is audited, including
    // re-applying the current value, so the trail records each admin action.
    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      A22_INTENDED_OWNERS,
      {
        resourceKind: 'innovation_pack',
        resourceId: saved.id,
        promote: saved.promote,
        outcome: 'promote_changed',
      }
    );

    return saved;
  }

  @Mutation(() => IInnovationPack, {
    description: 'Updates the InnovationPack.',
  })
  @Profiling.api
  async updateInnovationPack(
    @CurrentActor() actorContext: ActorContext,
    @Args('innovationPackData') innovationPackData: UpdateInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        innovationPackData.ID
      );
    // 027-platform-role-redesign (T042, A7, research D5): dual-path — the
    // owning organization keeps ordinary UPDATE, platform-support reaches
    // the same mutation via PLATFORM_SUPPORT_ORG_RESOURCES (cascaded from
    // the account, account.service.authorization.ts T037). Neither check
    // alone is sufficient; either satisfies the mutation.
    const canUpdateAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.UPDATE
    );
    const canUpdateAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        innovationPack.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
    if (!canUpdateAsOwner && !canUpdateAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        innovationPack.authorization,
        AuthorizationPrivilege.UPDATE,
        `updateInnovationPack: ${innovationPack.id}`
      );
    }

    // ensure working with UUID
    innovationPackData.ID = innovationPack.id;

    return await this.innovationPackService.update(innovationPackData);
  }

  @Mutation(() => IInnovationPack, {
    description: 'Deletes the specified InnovationPack.',
  })
  async deleteInnovationPack(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInnovationPackInput
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(deleteData.ID);
    // 027-platform-role-redesign (T043, A8, research D5): dual-path — the
    // owning organization keeps ordinary DELETE, platform-content-full-access
    // reaches the same mutation via its own privilege (cascaded from the
    // root policy, T036). Neither check alone is sufficient; either
    // satisfies the mutation.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      innovationPack.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsContentFullAccess =
      this.authorizationService.isAccessGranted(
        actorContext,
        innovationPack.authorization,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
    if (!canDeleteAsOwner && !canDeleteAsContentFullAccess) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        innovationPack.authorization,
        AuthorizationPrivilege.DELETE,
        `deleteInnovationPack: ${innovationPack.id}`
      );
    }
    const deleted =
      await this.innovationPackService.deleteInnovationPack(deleteData);
    // T058/FR-018a: audit ONLY on the PLATFORM branch.
    if (canDeleteAsContentFullAccess) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        {
          resourceKind: 'innovation-pack',
          resourceId: innovationPack.id,
          outcome: 'deleted',
        }
      );
    }
    return deleted;
  }
}
