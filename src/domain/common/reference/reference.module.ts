import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { ReferenceResolverMutations } from './reference.resolver.mutations';
import { ReferenceService } from './reference.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    StorageBucketModule,
    DocumentModule,
  ],
  providers: [ReferenceResolverMutations, ReferenceService],
  exports: [ReferenceService],
})
export class ReferenceModule {}
