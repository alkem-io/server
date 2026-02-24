import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IActorFull } from './actor.interface';
import { ActorService } from './actor.service';

@Resolver()
export class ActorResolverQueries {
  constructor(
    private readonly actorService: ActorService,
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

    const actor = await this.actorService.getActorOrNull(id);
    return actor as IActorFull | null;
  }
}
