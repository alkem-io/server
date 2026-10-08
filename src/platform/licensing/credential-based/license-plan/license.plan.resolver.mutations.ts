import {
  A13_INTENDED_OWNERS,
  buildLicenseDefinitionPolicy,
} from '@common/constants/authorization/license.definition.policy';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';

@InstrumentResolver()
@Resolver()
export class LicensePlanResolverMutations {
  /** Checked against THIS resolver-local, hardcoded IN_MEMORY policy
   * (`buildLicenseDefinitionPolicy`, shared by every license-definition
   * resolver) — NOT `licensePlan.licensingFramework.authorization`, which
   * inherits the root policy as its parent, so the root rule's
   * `platform-content-full-access` CRUD cascade would otherwise satisfy these
   * bare CREATE/UPDATE/DELETE checks too — a family the content-full-access
   * exception does not cover. */
  private licenseDefinitionPolicy: IAuthorizationPolicy =
    buildLicenseDefinitionPolicy();

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
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.DELETE,
      `deleteLicensePlan: ${licensePlan.id}`
    );
    const deleted = await this.licensePlanService.deleteLicensePlan(deleteData);
    // T058 — A13, single-path surface (bare DELETE, checked against the
    // resolver-local licenseDefinitionPolicy — see corr-server-7 fix above).
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
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
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.UPDATE,
      `update LicensePlan: ${licensePlan.id}`
    );

    const updated = await this.licensePlanService.update(updateData);
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      {
        setting: 'licensePlan',
        licensePlanId: updateData.ID,
        outcome: 'success',
      }
    );
    return updated;
  }
}
