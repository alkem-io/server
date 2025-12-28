import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CommunicationAdminOrphanedUsageResult } from '../domain/communication/dto/admin.communication.dto.orphaned.usage.result';
import { CommunicationAdminMembershipInput } from '@src/platform-admin/domain/communication/dto';
import { CommunicationAdminMembershipResult } from '../domain/communication/dto/admin.communication.dto.membership.result';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AdminCommunicationService } from '../domain/communication/admin.communication.service';

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
    @CurrentUser() actorContext: ActorContext
  ): Promise<CommunicationAdminMembershipResult> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
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
    @CurrentUser() actorContext: ActorContext
  ): Promise<CommunicationAdminOrphanedUsageResult> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin communication OrphanedUsage'
    );
    return await this.adminCommunicationService.orphanedUsage();
  }
}
