import {
  A13_INTENDED_OWNERS,
  A13_LEGACY_REACHERS,
  buildLicenseDefinitionPolicy,
} from '@common/constants/authorization/license.definition.policy';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { LicensingFrameworkService } from './licensing.framework.service';

@InstrumentResolver()
@Resolver()
export class LicensingFrameworkResolverMutations {
  /** 027-platform-role-redesign (server-C2-a, advocate/skeptic debate) —
   * checked against THIS resolver-local, hardcoded IN_MEMORY policy, NOT
   * `licensing.authorization` (the check this resolver ran before the fix),
   * which inherits the root policy as its parent, so the root rule's
   * `platform-content-full-access` CRUD cascade (T036a) satisfied this bare
   * CREATE check too — the one A13 surface the T058 census missed when it
   * moved the other five onto `licenseDefinitionPolicy`. See
   * common/constants/authorization/license.definition.policy.ts. */
  private licenseDefinitionPolicy: IAuthorizationPolicy =
    buildLicenseDefinitionPolicy();

  constructor(
    private authorizationService: AuthorizationService,
    private licensingFrameworkService: LicensingFrameworkService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {}

  @Mutation(() => ILicensePlan, {
    description: 'Create a new LicensePlan on the Licensing.',
  })
  async createLicensePlan(
    @CurrentActor() actorContext: ActorContext,
    @Args('planData') planData: CreateLicensePlanOnLicensingFrameworkInput
  ): Promise<ILicensePlan> {
    // getLicensingOrFail is kept so an unknown licensingFrameworkID still
    // 404s before the authorization check runs.
    const licensing = await this.licensingFrameworkService.getLicensingOrFail(
      planData.licensingFrameworkID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.CREATE,
      `create licensePlan on licensing framework: ${licensing.id}`
    );

    const created =
      await this.licensingFrameworkService.createLicensePlan(planData);
    // server-C2-a — mirrors the audit write the other five A13 surfaces
    // already make (license.plan/license.policy resolver mutations).
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      {
        setting: 'licensePlan',
        licensePlanId: created.id,
        outcome: 'success',
      }
    );
    return created;
  }
}
