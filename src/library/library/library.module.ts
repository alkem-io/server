import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { Library } from './library.entity';
import { LibraryResolverFields } from './library.resolver.fields';
import { LibraryResolverMutations } from './library.resolver.mutations';
import { LibraryService } from './library.service';
import { LibraryAuthorizationService } from './library.service.authorization';

@Module({
  imports: [
    InnovationPackModule,
    NamingModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Library]),
  ],
  providers: [
    LibraryResolverMutations,
    LibraryResolverFields,
    LibraryService,
    LibraryAuthorizationService,
  ],
  exports: [LibraryService, LibraryAuthorizationService],
})
export class LibraryModule {}
