import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { Visual } from './visual.entity';
import { VisualResolverMutations } from './visual.resolver.mutations';
import { VisualService } from './visual.service';
import { VisualAuthorizationService } from './visual.service.authorization';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    DocumentModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Visual]),
  ],
  providers: [
    VisualResolverMutations,
    VisualService,
    VisualAuthorizationService,
  ],
  exports: [VisualService, VisualAuthorizationService],
})
export class VisualModule {}
