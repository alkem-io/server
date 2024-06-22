import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicensePolicy } from './license.policy.interface';
import { LicensePolicyService } from './license.policy.service';
import { ILicensePolicyRuleFeatureFlag } from '@core/license-engine/license.policy.rule.feature.flag.interface';

@Resolver(() => ILicensePolicy)
export class LicensePolicyResolverFields {
  constructor(private licensePolicyService: LicensePolicyService) {}

  @ResolveField('featureFlagRules', () => [ILicensePolicyRuleFeatureFlag], {
    nullable: true,
    description:
      'The set of credential rules that are contained by this License Policy.',
  })
  featureFlagRules(
    @Parent() license: ILicensePolicy
  ): ILicensePolicyRuleFeatureFlag[] {
    return this.licensePolicyService.getFeatureFlagRules(license);
  }
}
