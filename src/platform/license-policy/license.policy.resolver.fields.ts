import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicensePolicy } from './license.policy.interface';
import { LicensePolicyService } from './license.policy.service';
import { ILicensePolicyCredentialRule } from '@core/license-engine';

@Resolver(() => ILicensePolicy)
export class LicensePolicyResolverFields {
  constructor(private licensePolicyService: LicensePolicyService) {}

  @ResolveField('credentialRules', () => [ILicensePolicyCredentialRule], {
    nullable: false,
    description:
      'The set of credential rules that are contained by this License Policy.',
  })
  credentialRules(
    @Parent() license: ILicensePolicy
  ): ILicensePolicyCredentialRule[] {
    return this.licensePolicyService.getCredentialRules(license);
  }
}
