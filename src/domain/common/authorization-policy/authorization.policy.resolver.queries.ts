import { Resolver, Query } from '@nestjs/graphql';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profiling } from '@common/decorators/profiling.decorator';
import { AuthorizationPolicyService } from './authorization.policy.service';

@Resolver()
export class AuthorizationPolicyResolverQueries {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  @Query(() => IAuthorizationPolicy, {
    nullable: false,
    description: 'The authorization policy for the platform',
  })
  @Profiling.api
  authorization(): IAuthorizationPolicy {
    return this.authorizationPolicyService.getPlatformAuthorizationPolicy();
  }
}
