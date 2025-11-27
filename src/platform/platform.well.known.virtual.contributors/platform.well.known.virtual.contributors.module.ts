import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';
import { PlatformWellKnownVirtualContributorsResolverMutations } from './platform.well.known.virtual.contributors.resolver.mutations';

@Module({
  imports: [
    TypeOrmModule.forFeature([Platform]),
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [
    PlatformWellKnownVirtualContributorsService,
    PlatformWellKnownVirtualContributorsResolverMutations,
  ],
  exports: [PlatformWellKnownVirtualContributorsService],
})
export class PlatformWellKnownVirtualContributorsModule {}
