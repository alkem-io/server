import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';
import { IFeatureFlag } from '../feature-flag/feature.flag.interface';

@Resolver(() => ILicense)
export class LicenseResolverFields {
  constructor(private licenseService: LicenseService) {}

  @ResolveField('featureFlags', () => [IFeatureFlag], {
    nullable: false,
    description: 'The FeatureFlags for the license',
  })
  featureFlags(@Parent() license: ILicense): IFeatureFlag[] {
    return this.licenseService.getFeatureFlags(license);
  }
}
