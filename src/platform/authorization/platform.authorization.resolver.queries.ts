import { Resolver, Query } from '@nestjs/graphql';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profiling } from '@common/decorators/profiling.decorator';
import { PlatformAuthorizationService } from './platform.authorization.service';

@Resolver()
export class PlatformAuthorizationResolverQueries {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationService
  ) {}

  @Query(() => IAuthorizationPolicy, {
    nullable: false,
    description: 'The authorization policy for the platform',
  })
  @Profiling.api
  authorization(): IAuthorizationPolicy {
    return this.platformAuthorizationService.getPlatformAuthorizationPolicy();
  }
}
