import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationLicenseService } from '@domain/collaboration/collaboration/collaboration.service.license';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { CalloutContributionService } from './callout.contribution.service';
import { DeleteContributionInput } from './dto/callout.contribution.dto.delete';
import { MoveCalloutContributionInput } from './dto/callout.contribution.dto.move';

@InstrumentResolver()
@Resolver()
export class CalloutContributionMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private calloutContributionMoveService: CalloutContributionMoveService,
    private collaborationLicenseService: CollaborationLicenseService,
    private readonly platformResourceAuditService: PlatformResourceAuditService
  ) {}

  @Mutation(() => ICalloutContribution, {
    description: 'Moves the specified Contribution to another Callout.',
  })
  async moveContributionToCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('moveContributionData')
    moveContributionData: MoveCalloutContributionInput
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        moveContributionData.contributionID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      contribution.authorization,
      AuthorizationPrivilege.MOVE_CONTRIBUTION,
      `move contribution: ${contribution.id}`
    );
    // Office Docs entitlement gate (FR-001/FR-004/FR-006/FR-009): when moving a
    // Collabora Document contribution, evaluate the *target* Callout's Collaboration
    // license only. Source state is irrelevant.
    if (contribution.type === CalloutContributionType.COLLABORA_DOCUMENT) {
      await this.collaborationLicenseService.ensureOfficeDocsAllowedForCallout(
        moveContributionData.calloutID
      );
    }
    const moved =
      await this.calloutContributionMoveService.moveContributionToCallout(
        moveContributionData.contributionID,
        moveContributionData.calloutID
      );
    // T058 — A9, single-path surface: every successful call is, by
    // construction, authorized by MOVE_CONTRIBUTION.
    await this.platformResourceAuditService.recordEventForActor(
      actorContext,
      [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
      [AuthorizationCredential.GLOBAL_ADMIN],
      {
        resourceKind: 'callout-contribution',
        resourceId: contribution.id,
        toAccountId: moveContributionData.calloutID,
        outcome: 'moved',
      }
    );
    return moved;
  }

  @Mutation(() => ICalloutContribution, {
    description: 'Deletes a contribution.',
  })
  public async deleteContribution(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteContributionInput
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        deleteData.ID
      );

    // 027-platform-role-redesign (T043, A8, research D5): dual-path — see
    // the identical comment in callout.resolver.mutations.ts.
    const canDeleteAsOwner = this.authorizationService.isAccessGranted(
      actorContext,
      contribution.authorization,
      AuthorizationPrivilege.DELETE
    );
    const canDeleteAsContentFullAccess =
      this.authorizationService.isAccessGranted(
        actorContext,
        contribution.authorization,
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
      );
    if (!canDeleteAsOwner && !canDeleteAsContentFullAccess) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        contribution.authorization,
        AuthorizationPrivilege.DELETE,
        `move contribution: ${contribution.id}`
      );
    }

    const deleted = await this.calloutContributionService.delete(
      contribution.id
    );
    // T058/FR-018a: audit ONLY on the PLATFORM branch.
    if (canDeleteAsContentFullAccess) {
      await this.platformResourceAuditService.recordEventForActor(
        actorContext,
        [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        {
          resourceKind: 'callout-contribution',
          resourceId: contribution.id,
          outcome: 'deleted',
        }
      );
    }
    return deleted;
  }
}
