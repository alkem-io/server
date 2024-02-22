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
import { CommunicationAdminOrphanedUsageResult } from './dto/admin.communication.dto.orphaned.usage.result';
import { GLOBAL_POLICY_ADMIN_COMMUNICATION_READ } from '@common/constants/authorization/global.policy.constants';

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
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.READ],
        GLOBAL_POLICY_ADMIN_COMMUNICATION_READ
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
    communicationData: CommunicationAdminMembershipInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationAdminMembershipResult> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationQueriesPolicy,
      AuthorizationPrivilege.READ,
      `admin communication room members query: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.communicationMembership(
      communicationData
    );
  }

  @Query(() => CommunicationAdminOrphanedUsageResult, {
    nullable: false,
    description:
      'Usage of the messaging platform that are not tied to the domain model.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async adminCommunicationOrphanedUsage(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationAdminOrphanedUsageResult> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationQueriesPolicy,
      AuthorizationPrivilege.READ,
      `admin communication room members query: ${agentInfo.email}`
    );
    return await this.adminCommunicationService.orphanedUsage();
  }
}
