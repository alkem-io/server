import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicenseEntitlement } from './license.entitlement.interface';
import { LicenseEntitlementService } from './license.entitlement.service';

@Resolver(() => ILicenseEntitlement)
export class LicenseEntitlementResolverFields {
  constructor(private licenseEntitlementService: LicenseEntitlementService) {}

  @ResolveField('isAvailable', () => Boolean, {
    nullable: false,
    description: 'Whether the specified entitlement is available.',
  })
  async isAvailable(
    @Parent() licenseEntitlement: ILicenseEntitlement
  ): Promise<boolean> {
    return await this.licenseEntitlementService.isEntitlementAvailable(
      licenseEntitlement.id
    );
  }

  @ResolveField('usage', () => Number, {
    nullable: false,
    description: 'The amount of the spcified entitlement used.',
  })
  async usage(
    @Parent() licenseEntitlement: ILicenseEntitlement
  ): Promise<number> {
    return await this.licenseEntitlementService.getEntitlementUsage(
      licenseEntitlement.id
    );
  }
}
