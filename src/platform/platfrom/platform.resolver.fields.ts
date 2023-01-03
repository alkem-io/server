import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IPlatform } from './platform.interface';

@Resolver(() => IPlatform)
export class PlatformResolverFields {
  constructor(
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The authorization policy for the platform',
  })
  authorization(): IAuthorizationPolicy {
    return this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
  }
}
