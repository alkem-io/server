import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine';
import { CreateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.create';
import { DeleteLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.delete';
import { UpdateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.update';
import { LicensePolicyService } from './license.policy.service';

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
export class LicensePolicyResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensePolicyService: LicensePolicyService,
    private readonly platformConfigurationAuditService: PlatformConfigurationAuditService
  ) {}

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
      licensePolicy.authorization,
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
      licensePolicy.authorization,
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
      licensePolicy.authorization,
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
