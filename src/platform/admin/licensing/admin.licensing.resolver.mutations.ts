import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AssignLicensePlanToSpace } from './dto/admin.licensing.dto.assign.license.plan.to.account';
import { LicensingService } from '@platform/licensing/licensing.service';
import { ILicensing } from '@platform/licensing/licensing.interface';
import { AdminLicensingService } from './admin.licensing.service';
import { RevokeLicensePlanFromSpace } from './dto/admin.licensing.dto.revoke.license.plan.from.account';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';

@Resolver()
export class AdminLicensingResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private licensingService: LicensingService,
    private adminLicensingService: AdminLicensingService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Assign the specified LicensePlan to a Space.',
  })
  @Profiling.api
  async assignLicensePlanToSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: AssignLicensePlanToSpace
  ): Promise<ISpace> {
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `assign licensePlan on licensing: ${licensing.id}`
    );

    const account = await this.adminLicensingService.assignLicensePlanToSpace(
      planData,
      licensing.id
    );
    // Need to trigger an authorization reset as some license credentials are used in auth policy e.g. VCs feature flag
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return account;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Revokes the specified LicensePlan on a Space.',
  })
  @Profiling.api
  async revokeLicensePlanFromSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('planData') planData: RevokeLicensePlanFromSpace
  ): Promise<ISpace> {
    let licensing: ILicensing | undefined;
    if (planData.licensingID) {
      licensing = await this.licensingService.getLicensingOrFail(
        planData.licensingID
      );
    } else {
      licensing = await this.licensingService.getDefaultLicensingOrFail();
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      licensing.authorization,
      AuthorizationPrivilege.GRANT,
      `revoke licensePlan on licensing: ${licensing.id}`
    );

    return await this.adminLicensingService.revokeLicensePlanFromSpace(
      planData,
      licensing.id
    );
  }
}
