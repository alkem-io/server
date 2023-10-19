import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { Library } from './library.entity';
import { LibraryResolverFields } from './library.resolver.fields';
import { LibraryResolverMutations } from './library.resolver.mutations';
import { LibraryService } from './library.service';
import { LibraryAuthorizationService } from './library.service.authorization';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';

@Module({
  imports: [
    InnovationPackModule,
    NamingModule,
    AuthorizationModule,
    StorageAggregatorModule,
    AuthorizationPolicyModule,
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
