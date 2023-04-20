import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { DocumentModule } from '../document/document.module';
import { StorageSpace } from './storage.space.entity';
import { StorageSpaceResolverFields } from './storage.space.resolver.fields';
import { StorageSpaceResolverMutations } from './storage.space.resolver.mutations';
import { StorageSpaceService } from './storage.space.service';
import { StorageSpaceAuthorizationService } from './storage.space.service.authorization';
import { VisualModule } from '@domain/common/visual/visual.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { Document } from '../document/document.entity';
import { ReferenceModule } from '@domain/common/reference/reference.module';

@Module({
  imports: [
    DocumentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    IpfsModule,
    VisualModule,
    EntityResolverModule,
    ReferenceModule,
    TypeOrmModule.forFeature([StorageSpace]),
    TypeOrmModule.forFeature([Document]),
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
