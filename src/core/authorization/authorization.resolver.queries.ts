import { Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from './authorization.service';
import { UsersWithAuthorizationCredentialInput } from '@core/authorization';
import { IUser, User } from '@domain/community/user';

@Resolver()
export class AuthorizationResolverQueries {
  constructor(private authorizationService: AuthorizationService) {}

  @Query(() => [User], {
    nullable: false,
    description:
      'All Users that hold credentials matching the supplied criteria.',
  })
  @Profiling.api
  async usersWithAuthorizationCredential(
    @Args('credentialsCriteriaData', { nullable: false })
    credentialsCriteriaData: UsersWithAuthorizationCredentialInput
  ): Promise<IUser[]> {
    return await this.authorizationService.usersWithCredentials(
      credentialsCriteriaData
    );
  }
}
