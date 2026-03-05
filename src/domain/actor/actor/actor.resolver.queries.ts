import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IActorFull } from './actor.interface';

@Resolver()
export class ActorResolverQueries {
  constructor(
    private readonly actorLookupService: ActorLookupService,
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => IActorFull, {
    nullable: true,
    description: 'Get an Actor by ID. Returns null if not found.',
  })
  async actor(
    @CurrentActor() actorContext: ActorContext,
    @Args('id', { type: () => UUID }) id: string
  ): Promise<IActorFull | null> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ,
      'actor query'
    );

    // Must use getFullActorById (queries the child table) instead of
    // getActorOrNull (queries only the parent actor table) so that
    // child-specific fields (email, firstName, contactEmail, etc.)
    // are loaded for GraphQL inline fragments.
    return this.actorLookupService.getFullActorById(id);
  }
}
