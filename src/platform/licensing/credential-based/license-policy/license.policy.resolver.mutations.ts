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
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformConfigurationAuditService } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.service';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine';
import { CreateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.create';
import { DeleteLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.delete';
import { UpdateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.update';
import { LicensePolicyService } from './license.policy.service';

@InstrumentResolver()
@Resolver()
export class LicensePolicyResolverMutations {
  /** 027-platform-role-redesign (corr-server-7/corr-server-10 fix, shared
   * via server-C2-a's `buildLicenseDefinitionPolicy`): checked against THIS
   * resolver-local, hardcoded IN_MEMORY policy — NOT
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
  private licenseDefinitionPolicy: IAuthorizationPolicy =
    buildLicenseDefinitionPolicy();

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
