import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingFrameworkService } from './licensing.framework.service';
import { CreateLicensePlanOnLicensingFrameworkInput } from './dto/licensing.framework.dto.create.license.plan';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class LicensingFrameworkResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private licensingFrameworkService: LicensingFrameworkService
  ) {}

  @Mutation(() => ILicensePlan, {
    description: 'Create a new LicensePlan on the Licensing.',
  })
  async createLicensePlan(
    @CurrentUser() actorContext: ActorContext,
    @Args('planData') planData: CreateLicensePlanOnLicensingFrameworkInput
  ): Promise<ILicensePlan> {
    const licensing = await this.licensingFrameworkService.getLicensingOrFail(
      planData.licensingFrameworkID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      licensing.authorization,
      AuthorizationPrivilege.CREATE,
      `create licensePlan on licensing framework: ${licensing.id}`
    );

    return await this.licensingFrameworkService.createLicensePlan(planData);
  }
}
