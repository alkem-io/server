import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { Reference } from './reference.entity';
import { ReferenceResolverMutations } from './reference.resolver.mutations';
import { ReferenceService } from './reference.service';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { DocumentModule } from '@domain/storage/document/document.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    StorageBucketModule,
    DocumentModule,
    TypeOrmModule.forFeature([Reference]),
  ],
  providers: [ReferenceResolverMutations, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
