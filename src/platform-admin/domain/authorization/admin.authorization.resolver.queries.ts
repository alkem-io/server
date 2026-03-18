import { AuthorizationPrivilege } from '@common/enums';
import { CredentialType } from '@common/enums/credential.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IActorFull } from '@domain/actor/actor/actor.interface';
import { UUID } from '@domain/common/scalars';
import { IUser } from '@domain/community/user/user.interface';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { AdminAuthorizationService } from './admin.authorization.service';
import { UsersWithAuthorizationCredentialInput } from './dto/authorization.dto.users.with.credential';

@InstrumentResolver()
@Resolver()
export class AdminAuthorizationResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => [IActorFull], {
    nullable: false,
    description:
      'All Actors that hold credentials matching the supplied criteria.',
  })
  async actorsWithCredential(
    @Args('credentialType', { type: () => CredentialType })
    credentialType: CredentialType,
    @Args('resourceID', { type: () => UUID, nullable: true })
    resourceID: string | undefined,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IActorFull[]> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `actorsWithCredential query: ${actorContext.actorID}`
    );
    return await this.adminAuthorizationService.actorsWithCredential(
      credentialType,
      resourceID
    );
  }

  @Query(() => [IUser], {
    nullable: false,
    description:
      'All Users that hold credentials matching the supplied criteria.',
  })
  async usersWithAuthorizationCredential(
    @Args('credentialsCriteriaData', { nullable: false })
    credentialsCriteriaData: UsersWithAuthorizationCredentialInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUser[]> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `authorization query: ${actorContext.actorID}`
    );
    return await this.adminAuthorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }
}
