import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { LibraryModule } from '@library/library/library.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { Platform } from './platform.entity';
import { PlatformResolverFields } from './platform.resolver.fields';
import { PlatformResolverMutations } from './platform.resolver.mutations';
import { PlatformResolverQueries } from './platform.resolver.queries';
import { PlatformService } from './platform.service';
import { PlatformAuthorizationService } from './platform.service.authorization';
import { InnovationHubModule } from '@domain/innovation-hub';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    CommunicationModule,
    PlatformAuthorizationPolicyModule,
    LibraryModule,
    StorageBucketModule,
    InnovationHubModule,
    TypeOrmModule.forFeature([Platform]),
  ],
  providers: [
    PlatformResolverQueries,
    PlatformResolverMutations,
    PlatformResolverFields,
    PlatformService,
    PlatformAuthorizationService,
  ],
  exports: [PlatformService, PlatformAuthorizationService],
})
export class PlatformModule {}
