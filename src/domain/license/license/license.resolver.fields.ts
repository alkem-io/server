import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';
import { ILicenseFeatureFlag } from '../feature-flag/feature.flag.interface';

@Resolver(() => ILicense)
export class LicenseResolverFields {
  constructor(private licenseService: LicenseService) {}

  @ResolveField('featureFlags', () => [ILicenseFeatureFlag], {
    nullable: false,
    description: 'The FeatureFlags for the license',
  })
  featureFlags(@Parent() license: ILicense): ILicenseFeatureFlag[] {
    return this.licenseService.getFeatureFlags(license);
  }
}
