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
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    CommunityPolicyModule,
    VisualModule,
    UserLookupModule,
    ProfileModule,
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
