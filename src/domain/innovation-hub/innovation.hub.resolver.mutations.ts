import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { DeleteInnovationHubInput } from './dto/innovation.hub.dto.delete';
import { UpdateInnovationHubInput } from './dto/innovation.hub.dto.update';
import { IInnovationHub } from './innovation.hub.interface';
import { InnovationHubService } from './innovation.hub.service';

@InstrumentResolver()
@Resolver()
export class InnovationHubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService,
    private readonly platformResourceAuditService: PlatformResourceAuditService
  ) {}

  @Mutation(() => IInnovationHub, {
    description: 'Update Innovation Hub.',
  })
  @Profiling.api
  async updateInnovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(updateData.ID);
    // 027-platform-role-redesign (T042, A7, research D5): dual-path — see
    // the identical comment in innovation.pack.resolver.mutations.ts.
    const canUpdateAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.UPDATE
    );
    const canUpdateAsPlatformSupport =
      this.authorizationService.isAccessGranted(
        actorContext,
        innovationHub.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
    if (!canUpdateAsOwner && !canUpdateAsPlatformSupport) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        innovationHub.authorization,
        AuthorizationPrivilege.UPDATE,
        'update innovation hub'
      );
    }

    return await this.innovationHubService.updateOrFail(updateData);
  }

  @Mutation(() => IInnovationHub, {
    description: 'Delete Innovation Hub.',
  })
  @Profiling.api
  async deleteInnovationHub(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(deleteData.ID);
    // 027-platform-role-redesign (T043, A8, research D5): dual-path — see
    // the identical comment in innovation.pack.resolver.mutations.ts.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      innovationHub.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsContentFullAccess =
      this.authorizationService.isAccessGranted(
        actorContext,
        innovationHub.authorization,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
    if (!canDeleteAsOwner && !canDeleteAsContentFullAccess) {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        innovationHub.authorization,
        AuthorizationPrivilege.DELETE,
        'delete innovation hub'
      );
    }
    const deleted = await this.innovationHubService.delete(deleteData.ID);
    // T058/FR-018a: audit ONLY on the PLATFORM branch.
    if (canDeleteAsContentFullAccess) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        [],
        {
          resourceKind: 'innovation-hub',
          resourceId: innovationHub.id,
          outcome: 'deleted',
        }
      );
    }
    return deleted;
  }
}
