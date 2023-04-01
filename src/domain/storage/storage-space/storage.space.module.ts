import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { DocumentModule } from '../document/document.module';
import { StorageSpace } from './storage.space.entity';
import { StorageSpaceResolverFields } from './storage.space.resolver.fields';
import { StorageSpaceResolverMutations } from './storage.space.resolver.mutations';
import { StorageSpaceService } from './storage.space.service';
import { StorageSpaceAuthorizationService } from './storage.space.service.authorization';

@Module({
  imports: [
    DocumentModule,
    NamingModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([StorageSpace]),
  ],
  providers: [
    StorageSpaceResolverFields,
    StorageSpaceService,
    StorageSpaceResolverMutations,
    StorageSpaceAuthorizationService,
  ],
  exports: [StorageSpaceService, StorageSpaceAuthorizationService],
})
export class StorageSpaceModule {}
