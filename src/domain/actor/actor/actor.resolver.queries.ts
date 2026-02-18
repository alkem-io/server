import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CredentialType } from '@common/enums/credential.type';
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
    // Check platform-level read access
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ,
      'actor query'
    );

    const actor = await this.actorService.getActorOrNull(id);
    return actor as IActorFull | null;
  }

  @Query(() => [IActorFull], {
    description:
      'Find all Actors that have a credential matching the specified type and optional resourceID.',
  })
  async actorsWithCredential(
    @CurrentActor() actorContext: ActorContext,
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID?: string
  ): Promise<IActorFull[]> {
    // Check platform-level read access
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ,
      'actorsWithCredential query'
    );

    const actors = await this.actorService.findActorsWithMatchingCredentials({
      type: credentialType,
      resourceID,
    });

    return actors as IActorFull[];
  }
}
