import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CredentialType } from '@common/enums/credential.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IActorFull } from '@domain/actor/actor/actor.interface';
import { UUID } from '@domain/common/scalars';
import { IUser } from '@domain/community/user/user.interface';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  checkCredentialHolderListAccessOrFail,
  isRoleHolderListCredential,
} from '@platform/platform-role/platform.role.holder.list.access';
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
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    // 027-platform-role-redesign (sec-server-10 fix): a `platform-*`/
    // `feature-*` TARGET role credential is gated by the SAME A20/A20b
    // holder-list predicate `role.set.resolver.fields.ts` enforces — NOT
    // the blanket `READ_USERS` every registered user holds, which this
    // query previously (and still, for every OTHER credential type) checks.
    // Adding the twelve new role credentials to `CredentialType` is what
    // made this query able to name them at all; leaving `READ_USERS` as the
    // ONLY gate would let any authenticated user enumerate every holder of
    // those roles — the exact administrator-reconnaissance A20 exists to
    // withhold.
    if (
      isRoleHolderListCredential(
        credentialType as unknown as AuthorizationCredential
      )
    ) {
      checkCredentialHolderListAccessOrFail(
        this.authorizationService,
        actorContext,
        platformAuthorization,
        credentialType as unknown as AuthorizationCredential
      );
    } else {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        platformAuthorization,
        AuthorizationPrivilege.READ_USERS,
        `actorsWithCredential query: ${actorContext.actorID}`
      );
    }
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
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    // sec-server-10 fix: see actorsWithCredential's identical comment above.
    if (isRoleHolderListCredential(credentialsCriteriaData.type)) {
      checkCredentialHolderListAccessOrFail(
        this.authorizationService,
        actorContext,
        platformAuthorization,
        credentialsCriteriaData.type
      );
    } else {
      await this.authorizationService.grantAccessOrFail(
        actorContext,
        platformAuthorization,
        AuthorizationPrivilege.READ_USERS,
        `authorization query: ${actorContext.actorID}`
      );
    }
    return await this.adminAuthorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }
}
