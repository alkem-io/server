import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Post } from './post.entity';
import { PostResolverMutations } from './post.resolver.mutations';
import { PostService } from './post.service';
import { PostResolverFields } from './post.resolver.fields';
import { PostAuthorizationService } from './post.service.authorization';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';

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
