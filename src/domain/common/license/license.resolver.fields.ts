import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';
import { ILicenseEntitlement } from '../license-entitlement/license.entitlement.interface';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';

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

  @ResolveField('myLicensePrivileges', () => [LicenseEntitlementType], {
    nullable: false,
    description: 'The set of License Entitlements on that entity.',
  })
  async myLicensePrivileges(
    @Parent() license: ILicense
  ): Promise<LicenseEntitlementType[]> {
    return await this.licenseService.getMyLicensePrivilegesOrFail(license);
  }
}
