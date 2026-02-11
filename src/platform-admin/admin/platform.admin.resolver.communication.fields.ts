import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AdminCommunicationService } from '../domain/communication/admin.communication.service';
import { CommunicationAdminMembershipInput } from '../domain/communication/dto/admin.communication.dto.membership.input';
import { CommunicationAdminMembershipResult } from '../domain/communication/dto/admin.communication.dto.membership.result';
import { CommunicationAdminOrphanedUsageResult } from '../domain/communication/dto/admin.communication.dto.orphaned.usage.result';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';

@Resolver(() => PlatformAdminCommunicationQueryResults)
export class PlatformAdminCommunicationResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminCommunicationService: AdminCommunicationService
  ) {}

  @ResolveField(() => CommunicationAdminMembershipResult, {
    nullable: false,
    description: 'All Users that are members of a given room',
  })
  async adminCommunicationMembership(
    @Args('communicationData', { nullable: false })
    communicationData: CommunicationAdminMembershipInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationAdminMembershipResult> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin communicationMembership'
    );

    return await this.adminCommunicationService.communicationMembership(
      communicationData
    );
  }

  @ResolveField(() => CommunicationAdminOrphanedUsageResult, {
    nullable: false,
    description:
      'Usage of the messaging platform that are not tied to the domain model.',
  })
  async adminCommunicationOrphanedUsage(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationAdminOrphanedUsageResult> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin communication OrphanedUsage'
    );
    return await this.adminCommunicationService.orphanedUsage();
  }
}
