import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostResolverFields } from './post.resolver.fields';
import { PostResolverMutations } from './post.resolver.mutations';
import { PostService } from './post.service';
import { PostAuthorizationService } from './post.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    RoleSetModule,
    VisualModule,
    UserLookupModule,
    ProfileModule,
    PlatformRolesAccessModule,
    TypeOrmModule.forFeature([Post]),
  ],
  providers: [
    PostResolverMutations,
    PostService,
    PostAuthorizationService,
    PostResolverFields,
  ],
  exports: [PostService, PostAuthorizationService],
})
export class PostModule {}
