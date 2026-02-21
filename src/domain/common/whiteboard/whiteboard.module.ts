import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { LicenseModule } from '../license/license.module';
import { ProfileModule } from '../profile/profile.module';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardGuestAccessService } from './whiteboard.guest-access.service';
import { WhiteboardResolverFields } from './whiteboard.resolver.fields';
import { WhiteboardResolverMutations } from './whiteboard.resolver.mutations';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardAuthorizationService } from './whiteboard.service.authorization';

@Module({
  imports: [
    EntityResolverModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseModule,
    VisualModule,
    ProfileModule,
    UserModule,
    RoleSetModule,
    PlatformRolesAccessModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Whiteboard]),
    ProfileDocumentsModule,
  ],
  providers: [
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardGuestAccessService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
  ],
  exports: [
    WhiteboardService,
    WhiteboardAuthorizationService,
    WhiteboardGuestAccessService,
    WhiteboardResolverMutations,
    WhiteboardResolverFields,
  ],
})
export class WhiteboardModule {}
