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

@Module({
  imports: [
    DocumentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    IpfsModule,
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
