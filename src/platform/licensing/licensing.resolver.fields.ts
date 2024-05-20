import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { ILicensing } from './licensing.interface';
import { LicensingService } from './licensing.service';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { ILicensePolicy } from '@platform/license-policy';

@Resolver(() => ILicensing)
export class LicensingResolverFields {
  constructor(private licensingService: LicensingService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('plans', () => [ILicensePlan], {
    nullable: false,
    description: 'The License Plans in use on the platform.',
  })
  @UseGuards(GraphqlGuard)
  async plans(@Parent() licensing: ILicensing): Promise<ILicensePlan[]> {
    return await this.licensingService.getLicensePlans(licensing.id);
  }

  @ResolveField('policy', () => ILicensePolicy, {
    nullable: false,
    description: 'The LicensePolicy in use by the License Manager.',
  })
  policy(@Parent() licensing: ILicensing): Promise<ILicensePolicy> {
    return this.licensingService.getLicensePolicy(licensing.id);
  }
}
