import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
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
      `authorization query: ${actorContext.actorId}`
    );
    return await this.adminAuthorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }
}
