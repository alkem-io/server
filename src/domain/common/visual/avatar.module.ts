import { Module } from '@nestjs/common';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { VisualModule } from './visual.module';
import { AvatarService } from './avatar.service';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';

@Module({
  imports: [
    VisualModule,
    StorageBucketModule,
    DocumentModule,
    AuthorizationPolicyModule,
  ],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
