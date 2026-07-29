import { GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensePlanService } from '@platform/licensing/credential-based/license-plan/license.plan.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { DeleteLicensePlanInput } from './dto/license.plan.dto.delete';
import { UpdateLicensePlanInput } from './dto/license.plan.dto.update';

/** T058 — A13's declared owner/legacy-reachers (T040's grant).
 * GLOBAL_ADMIN added (corr-server-10 fix): it reached A13 today only via
 * the root content cascade — an implicit reach the declaration omitted. */
const A13_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
];
const A13_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class LicensePlanResolverMutations {
  /** 027-platform-role-redesign (corr-server-7/corr-server-10 fix): checked
   * against THIS resolver-local, hardcoded IN_MEMORY policy — NOT
   * `licensePlan.licensingFramework.authorization`, which inherits the root
   * policy as its parent, so the root rule's `platform-content-full-access`
   * CRUD cascade (T036a) would otherwise satisfy these bare
   * CREATE/UPDATE/DELETE checks too — a family SC-004's exception does not
   * cover. */
  private licenseDefinitionPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private licensePlanService: LicensePlanService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    const rule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
        ],
        GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN
      );
    this.licenseDefinitionPolicy =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        policy,
        [rule]
      );
  }

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
