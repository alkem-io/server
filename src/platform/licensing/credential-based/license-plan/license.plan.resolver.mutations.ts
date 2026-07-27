import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';

/** T058 — A13's declared owner/legacy-reachers (T040's grant). */
const A13_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
];
const A13_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class LicensePlanResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensePlanService: LicensePlanService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {}

  @Mutation(() => ILicensePlan, {
    description: 'Deletes the specified LicensePlan.',
  })
  async deleteLicensePlan(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      deleteData.ID,
      {
        relations: {
          licensingFramework: {
            authorization: true,
          },
        },
      }
    );
    if (!licensePlan.licensingFramework) {
      throw new EntityNotFoundException(
        `Unable to find Licensing for LicensePlan with ID: ${deleteData.ID}`,
        LogContext.LICENSE
      );
    }
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      licensePlan.licensingFramework.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteLicensePlan: ${licensePlan.id}`
    );
    const deleted = await this.licensePlanService.deleteLicensePlan(deleteData);
    // T058 — A13, single-path surface (bare DELETE on licensing-framework).
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      {
        setting: 'licensePlan',
        licensePlanId: deleteData.ID,
        outcome: 'success',
      }
    );
    return deleted;
  }

  @Mutation(() => ILicensePlan, {
    description: 'Updates the LicensePlan.',
  })
  async updateLicensePlan(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateLicensePlanInput
  ): Promise<ILicensePlan> {
    const licensePlan = await this.licensePlanService.getLicensePlanOrFail(
      updateData.ID,
      {
        relations: {
          licensingFramework: {
            authorization: true,
          },
        },
      }
    );
    if (!licensePlan.licensingFramework) {
      throw new EntityNotFoundException(
        `Unable to find Licensing for LicensePlan with ID: ${updateData.ID}`,
        LogContext.LICENSE
      );
    }
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      licensePlan.licensingFramework.authorization,
      AuthorizationPrivilege.UPDATE,
      `update LicensePlan: ${licensePlan.id}`
    );

    const updated = await this.licensePlanService.update(updateData);
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      {
        setting: 'licensePlan',
        licensePlanId: updateData.ID,
        outcome: 'success',
      }
    );
    return updated;
  }
}
