import { CurrentUser, Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { AdminCommunicationService } from './admin.communication.service';
import { CommunicationAdminMembershipInput } from './dto';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunicationAdminMembershipResult } from './dto/admin.communication.dto.membership.result';

@Resolver()
export class AdminCommunicationResolverQueries {
  private authorizationQueriesPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminCommunicationService: AdminCommunicationService
  ) {
    this.authorizationQueriesPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.REGISTERED],
        [AuthorizationPrivilege.READ]
      );
  }

  @Query(() => CommunicationAdminMembershipResult, {
    nullable: false,
    description: 'All Users that are members of a given room',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async adminCommunicationMembership(
    @Args('communicationData', { nullable: false })
    roomData: CommunicationAdminMembershipInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationAdminMembershipResult> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationQueriesPolicy,
      AuthorizationPrivilege.READ,
      `admin communication room members query: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.communicationMembership(
      roomData
    );
  }
}
