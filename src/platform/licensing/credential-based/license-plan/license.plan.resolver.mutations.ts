import {
  A13_INTENDED_OWNERS,
  A13_LEGACY_REACHERS,
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
  /** 027-platform-role-redesign (corr-server-7/corr-server-10 fix, shared
   * via server-C2-a's `buildLicenseDefinitionPolicy`): checked against THIS
   * resolver-local, hardcoded IN_MEMORY policy — NOT
   * `licensePlan.licensingFramework.authorization`, which inherits the root
   * policy as its parent, so the root rule's `platform-content-full-access`
   * CRUD cascade (T036a) would otherwise satisfy these bare
   * CREATE/UPDATE/DELETE checks too — a family SC-004's exception does not
   * cover.
   *
   * GLOBAL_SUPPORT included (corr-server-12 fix): `licensingFramework.
   * authorization` is ALSO built by `inheritParentAuthorization(licensing.
   * authorization, platform.authorization)`, and `platform.authorization`
   * carries `globalSupportPlatformAdmin` — a `cascade: true` rule granting
   * global-support CRUD (platform.service.authorization.ts). Pre-feature
   * that cascade reached these mutations (checked against
   * `licensePlan.licensingFramework.authorization` directly); omitting
   * global-support here would silently revoke a capability Slice A must
   * stay additive about. */
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
      this.licenseDefinitionPolicy,
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
