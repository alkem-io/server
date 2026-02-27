import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { ILicensingCredentialBasedPolicyCredentialRule } from '../licensing-credential-based-entitlements-engine';
import { CreateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.create';
import { DeleteLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.delete';
import { UpdateLicensePolicyCredentialRuleInput } from './dto/license.policy.dto.credential.rule.update';
import { LicensePolicyService } from './license.policy.service';

@InstrumentResolver()
@Resolver()
export class LicensePolicyResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensePolicyService: LicensePolicyService
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
    return await this.licensePolicyService.deleteLicensePolicyCredentialRule(
      deleteData.ID,
      licensePolicy
    );
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

    return await this.licensePolicyService.updateCredentialRule(updateData);
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

    return await this.licensePolicyService.createCredentialRule(createData);
  }
}
