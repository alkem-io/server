import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProxySurfaceUsageInput } from '@domain/communication/proxy-surface/dto/proxy.surface.usage.input';
import { ProxySurfaceUsageResult } from '@domain/communication/proxy-surface/dto/proxy.surface.usage.result';
import { ProxySurfaceUsageReadService } from '@domain/communication/proxy-surface/proxy.surface.usage.read.service';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { createCommunicationOperationsPolicy } from '../domain/communication/admin.communication.policy';
import { AdminCommunicationService } from '../domain/communication/admin.communication.service';
import { CommunicationAdminMembershipInput } from '../domain/communication/dto/admin.communication.dto.membership.input';
import { CommunicationAdminMembershipResult } from '../domain/communication/dto/admin.communication.dto.membership.result';
import { CommunicationAdminOrphanedUsageResult } from '../domain/communication/dto/admin.communication.dto.orphaned.usage.result';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';

@Resolver(() => PlatformAdminCommunicationQueryResults)
export class PlatformAdminCommunicationResolverFields {
  private readonly communicationOperationsPolicy: IAuthorizationPolicy;

  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminCommunicationService: AdminCommunicationService,
    private proxySurfaceUsageReadService: ProxySurfaceUsageReadService,
    authorizationPolicyService: AuthorizationPolicyService
  ) {
    this.communicationOperationsPolicy = createCommunicationOperationsPolicy(
      authorizationPolicyService
    );
  }

  @ResolveField(() => ProxySurfaceUsageResult, {
    nullable: false,
    description:
      'Per-UTC-day usage of the message proxy surfaces (send, reply, reactions, remove, mark read, direct send, room message reads, room and conversation event subscriptions), split by disposition, caller class, room kind and media flag, with the liveness heartbeat beside it. Days with no ledger data are omitted — never reported as zero. Operators only.',
  })
  async proxySurfaceUsage(
    @Args('usageData', { nullable: false })
    usageData: ProxySurfaceUsageInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<ProxySurfaceUsageResult> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationOperationsPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      'platformAdmin communication proxySurfaceUsage'
    );

    return this.proxySurfaceUsageReadService.read(usageData.days);
  }

  @ResolveField(() => CommunicationAdminMembershipResult, {
    nullable: false,
    description: 'All Users that are members of a given room',
  })
  async adminCommunicationMembership(
    @Args('communicationData', { nullable: false })
    communicationData: CommunicationAdminMembershipInput,
    @CurrentActor() actorContext: ActorContext
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
    @CurrentActor() actorContext: ActorContext
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
