import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { IActorFull } from './actor.interface';

@Resolver()
export class ActorResolverQueries {
  constructor(
    private readonly actorLookupService: ActorLookupService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @Query(() => IActorFull, {
    nullable: true,
    description: 'Get an Actor by ID. Returns null if not found.',
  })
  async actor(
    @CurrentActor() actorContext: ActorContext,
    @Args('id', { type: () => UUID }) id: string
  ): Promise<IActorFull | null> {
    // Must use getFullActorById (queries the child table) instead of
    // getActorOrNull (queries only the parent actor table) so that
    // child-specific fields (email, firstName, contactEmail, etc.)
    // are loaded for GraphQL inline fragments.
    const actor = await this.actorLookupService.getFullActorById(id);
    if (!actor) return null;

    this.authorizationService.grantAccessOrFail(
      actorContext,
      actor.authorization,
      AuthorizationPrivilege.READ,
      `actor query ${actor.type}: ${id}`
    );

    return actor;
  }
}
