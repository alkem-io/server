import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { Platform } from './platform.entity';
import { PlatformResolverFields } from './platform.resolver.fields';
import { PlatformResolverMutations } from './platform.resolver.mutations';
import { PlatformResolverQueries } from './platform.resolver.queries';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';

@Module({
  imports: [
    InnovationPackModule,
    NamingModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    TypeOrmModule.forFeature([Platform]),
  ],
  providers: [
    PlatformResolverQueries,
    PlatformResolverMutations,
    PlatformResolverFields,
    PlatformService,
    PlatformAuthorizationService,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}
