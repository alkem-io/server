import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Query, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IPlatform } from './platform.interface';
import { PlatformService } from './platform.service';

@Resolver(() => IPlatform)
export class PlatformResolverQueries {
  constructor(
    private platformService: PlatformService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => IPlatform, {
    nullable: false,
    description: 'Alkemio Platform',
  })
  async platform(): Promise<IPlatform> {
    return await this.platformService.getPlatformOrFail({});
  }

  // Todo: there is some additional tidy up needed related to platform level authorization + how
  // it is accessed. This query should likely go, as should some of the top level configuration
  // queries.
  @Query(() => IAuthorizationPolicy, {
    nullable: false,
    description: 'The authorization policy for the platform',
  })
  authorization(): IAuthorizationPolicy {
    return this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
  }
}
