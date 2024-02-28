import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { ProfileModule } from '../profile/profile.module';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardResolverFields } from './whiteboard.resolver.fields';
import { WhiteboardResolverMutations } from './whiteboard.resolver.mutations';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';

@Module({
  imports: [
    EntityResolverModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    VisualModule,
    ProfileModule,
    UserModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Whiteboard]),
    ProfileDocumentsModule,
  ],
  providers: [
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
  ],
  exports: [
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
  ],
})
export class WhiteboardModule {}
