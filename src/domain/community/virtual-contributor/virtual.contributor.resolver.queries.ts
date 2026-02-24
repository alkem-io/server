import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ContributorQueryArgs } from '@domain/actor/actor/dto/actor.query.args';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { IVirtualContributor } from './virtual.contributor.interface';
import { VirtualContributorService } from './virtual.contributor.service';

@InstrumentResolver()
@Resolver()
export class VirtualContributorResolverQueries {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [IVirtualContributor], {
    nullable: false,
    description:
      'The VirtualContributors on this platform; only accessible to platform admins',
  })
  async virtualContributors(
    @Args({ nullable: true }) args: ContributorQueryArgs,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IVirtualContributor[]> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    const hasAccess = this.authorizationService.isAccessGranted(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN
    );

    if (!hasAccess) {
      return [];
    }
    return await this.virtualContributorService.getVirtualContributors(args);
  }

  @Query(() => IVirtualContributor, {
    nullable: false,
    description: 'A particular VirtualContributor',
  })
  async virtualContributor(
    @Args('ID', { type: () => UUID, nullable: false }) id: string
  ): Promise<IVirtualContributor> {
    return await this.virtualContributorService.getVirtualContributorByIdOrFail(
      id
    );
  }
}
