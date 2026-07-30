import { GLOBAL_POLICY_LICENSE_DEFINITION_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine';
import { CreateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.create';
import { DeleteLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.delete';
import { UpdateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.update';
import { LicensePolicyService } from './license.policy.service';

/** T058 — A13's declared owner/legacy-reachers (T040's grant).
 * GLOBAL_ADMIN added (corr-server-10 fix): it reached A13 today only via
 * the root content cascade — an implicit reach the declaration omitted.
 * GLOBAL_SUPPORT added (corr-server-12 fix): it reaches A13 via
 * `globalSupportPlatformAdmin`'s cascade off `platform.authorization`
 * (platform.service.authorization.ts) into `licensingFramework.authorization`
 * — an implicit reach the declaration likewise omitted. */
const A13_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_SETTINGS_ADMIN,
];
const A13_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class LicensePolicyResolverMutations {
  /** 027-platform-role-redesign (corr-server-7/corr-server-10 fix): checked
   * against THIS resolver-local, hardcoded IN_MEMORY policy — NOT
   * `licensePolicy.authorization`, which inherits the root policy
   * (transitively, via the licensing framework), so the root rule's
   * `platform-content-full-access` CRUD cascade (T036a) would otherwise
   * satisfy these bare CREATE/UPDATE/DELETE checks too — a family SC-004's
   * exception does not cover.
   *
   * GLOBAL_SUPPORT included (corr-server-12 fix): the licensing framework's
   * authorization ALSO inherits `platform.authorization`, which carries
   * `globalSupportPlatformAdmin` — a `cascade: true` rule granting
   * global-support CRUD (platform.service.authorization.ts). Omitting it
   * here would silently revoke a pre-feature reach, which the additive
   * slice must not do. */
  private licenseDefinitionPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private licensePolicyService: LicensePolicyService,
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
          AuthorizationCredential.GLOBAL_SUPPORT,
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

  @Mutation(() => ILicensingCredentialBasedPolicyCredentialRule, {
    description: 'Deletes the specified LicensePolicy.',
  })
  async adminLicensePolicyDeleteCredentialRule(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteLicensePolicyCredentialRuleInput
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const licensePolicy =
      await this.licensePolicyService.getDefaultLicensePolicyOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.DELETE,
      `delete LicensePolicy CredentialRule: ${licensePolicy.id}`
    );
    const deleted =
      await this.licensePolicyService.deleteLicensePolicyCredentialRule(
        deleteData.ID,
        licensePolicy
      );
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      { setting: 'licensePolicyCredentialRule', outcome: 'success' }
    );
    return deleted;
  }

  @Mutation(() => ILicensingCredentialBasedPolicyCredentialRule, {
    description: 'Updates a CredentialRule on the LicensePolicy.',
  })
  async adminLicensePolicyUpdateCredentialRule(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateLicensePolicyCredentialRuleInput
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const licensePolicy =
      await this.licensePolicyService.getDefaultLicensePolicyOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.UPDATE,
      `update LicensePolicy credential rule: ${licensePolicy.id}`
    );

    const updated =
      await this.licensePolicyService.updateCredentialRule(updateData);
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      { setting: 'licensePolicyCredentialRule', outcome: 'success' }
    );
    return updated;
  }

  @Mutation(() => ILicensingCredentialBasedPolicyCredentialRule, {
    description: 'Creates a CredentialRule on the LicensePolicy.',
  })
  async adminLicensePolicyCreateCredentialRule(
    @CurrentActor() actorContext: ActorContext,
    @Args('createData') createData: CreateLicensePolicyCredentialRuleInput
  ): Promise<ILicensingCredentialBasedPolicyCredentialRule> {
    const licensePolicy =
      await this.licensePolicyService.getDefaultLicensePolicyOrFail();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.licenseDefinitionPolicy,
      AuthorizationPrivilege.CREATE,
      `create LicensePolicy credential rule: ${licensePolicy.id}`
    );

    const created =
      await this.licensePolicyService.createCredentialRule(createData);
    await this.platformConfigurationAuditService.recordChangeForActor(
      actorContext,
      A13_INTENDED_OWNERS,
      A13_LEGACY_REACHERS,
      { setting: 'licensePolicyCredentialRule', outcome: 'success' }
    );
    return created;
  }
}
