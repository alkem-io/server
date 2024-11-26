import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicensePolicy } from './license.policy.interface';
import { LicensePolicyService } from './license.policy.service';
import { ILicensingCredentialBasedPolicyCredentialRule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine';

@Resolver(() => ILicensePolicy)
export class LicensePolicyResolverFields {
  constructor(private licensePolicyService: LicensePolicyService) {}

  @ResolveField(
    'credentialRules',
    () => [ILicensingCredentialBasedPolicyCredentialRule],
    {
      nullable: false,
      description:
        'The set of credential rules that are contained by this License Policy.',
    }
  )
  credentialRules(
    @Parent() license: ILicensePolicy
  ): ILicensingCredentialBasedPolicyCredentialRule[] {
    return this.licensePolicyService.getCredentialRules(license);
  }
}
