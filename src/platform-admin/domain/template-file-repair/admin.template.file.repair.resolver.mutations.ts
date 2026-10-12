import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { AdminTemplateFileRepairService } from './admin.template.file.repair.service';
import { AdminTemplateFileRepairInput } from './dto/admin.template.file.repair.input';
import { AdminTemplateFileRepairResult } from './dto/admin.template.file.repair.result';

@InstrumentResolver()
@Resolver()
export class AdminTemplateFileRepairResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly platformOperationsAuditService: PlatformOperationsAuditService,
    private readonly templateFileRepairService: AdminTemplateFileRepairService
  ) {}

  @Mutation(() => AdminTemplateFileRepairResult, {
    description:
      "Lists, and on request copies, the files templates reference but do not store. A file is copied only when the template's owner can read it. A dry run by default.",
  })
  async adminRepairTemplateFiles(
    @CurrentActor() actorContext: ActorContext,
    @Args('repairData') repairData: AdminTemplateFileRepairInput
  ): Promise<AdminTemplateFileRepairResult> {
    const action = 'adminRepairTemplateFiles';
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      action
    );
    const target = {
      dryRun: repairData.dryRun,
      templateIDs: repairData.templateIDs ?? [],
    };
    try {
      const result = await this.templateFileRepairService.repair(
        repairData.templateIDs,
        repairData.dryRun,
        actorContext
      );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action,
        outcome: result.failed.length === 0 ? 'success' : 'failure',
        target: {
          ...target,
          templatesWithForeignFiles: result.templatesWithForeignFiles,
          references: result.references.length,
          copiedReferences: result.copiedReferences,
          failed: result.failed.length,
        },
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action,
        outcome: 'failure',
        target,
        error,
      });
      throw error;
    }
  }
}
