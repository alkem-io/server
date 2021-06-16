import { Profiling } from '@src/common/decorators';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from './authorization.service';
import { UsersWithAuthorizationCredentialInput } from '@core/authorization';
import { IUser } from '@domain/community/user';
import { AuthorizationPrivilege } from '@common/enums';
import { UserAuthorizationPrivilegesInput } from './dto/authorization.dto.user.authorization.privileges';

@Resolver()
export class AuthorizationResolverQueries {
  constructor(private authorizationService: AuthorizationService) {}

  @Query(() => [IUser], {
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

  @Query(() => [AuthorizationPrivilege], {
    nullable: false,
    description:
      'Privileges assigned to a User (based on held credentials) given an Authorization defnition.',
  })
  @Profiling.api
  async userAuthorizationPrivileges(
    @Args('userAuthorizationPrivilegesData', { nullable: false })
    userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput
  ): Promise<AuthorizationPrivilege[]> {
    return await this.authorizationService.userAuthorizationPrivileges(
      userAuthorizationPrivilegesData
    );
  }
}
