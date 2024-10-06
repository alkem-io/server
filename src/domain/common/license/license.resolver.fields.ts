import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ILicense } from './license.interface';
import { LicenseService } from './license.service';
import { IEntitlement } from '../license-entitlement/entitlement.interface';

@Resolver(() => ILicense)
export class LicenseResolverFields {
  constructor(private licenseService: LicenseService) {}

  @ResolveField('entitlements', () => [IEntitlement], {
    nullable: false,
    description:
      'The set of Entitlements associated with the License applicable to this entity.',
  })
  async entitlements(@Parent() license: ILicense): Promise<IEntitlement[]> {
    return await this.licenseService.getEntitlements(license);
  }
}
