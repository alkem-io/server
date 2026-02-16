import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { VisualResolverMutations } from './visual.resolver.mutations';
import { VisualService } from './visual.service';
import { VisualAuthorizationService } from './visual.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    DocumentModule,
    StorageBucketModule,
  ],
  providers: [
    VisualResolverMutations,
    VisualService,
    VisualAuthorizationService,
  ],
  exports: [VisualService, VisualAuthorizationService],
})
export class VisualModule {}
