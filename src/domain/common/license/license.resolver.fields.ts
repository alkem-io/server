import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';

@Resolver(() => ILicense)
export class LicenseResolverFields {
  constructor(private licenseService: LicenseService) {}

  @ResolveField('entitlements', () => [ILicenseEntitlement], {
    nullable: false,
    description:
      'The set of Entitlements associated with the License applicable to this entity.',
  })
  async entitlements(
    @Parent() license: ILicense
  ): Promise<ILicenseEntitlement[]> {
    return await this.licenseService.getEntitlements(license);
  }

  @ResolveField('availableEntitlements', () => [LicenseEntitlementType], {
    nullable: true,
    description: 'The set of License Entitlement Types on that entity.',
  })
  async availableEntitlements(
    @Parent() license: ILicense
  ): Promise<LicenseEntitlementType[]> {
    return await this.licenseService.getMyLicensePrivilegesOrFail(license);
  }
}
