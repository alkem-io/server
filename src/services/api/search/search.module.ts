import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserGroup } from '@domain/community/user-group';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { User } from '@domain/community/user/user.entity';
import { UserModule } from '@domain/community/user/user.module';
import { SearchResolverQueries } from './search.resolver.queries';
import { SearchService } from './search.service';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { Organization } from '@domain/community/organization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Space } from '@domain/space/space/space.entity';
import { SpaceModule } from '@domain/space/space/space.module';
import { PostModule } from '@domain/collaboration/post/post.module';
import { Post } from '@domain/collaboration/post/post.entity';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Search2Module } from '@services/api/search2/search2.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    UserModule,
    UserGroupModule,
    OrganizationModule,
    SpaceModule,
    CollaborationModule,
    PostModule,
    CalloutModule,
    Search2Module,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([UserGroup]),
    TypeOrmModule.forFeature([Organization]),
    TypeOrmModule.forFeature([Space]),
    TypeOrmModule.forFeature([Post]),
    TypeOrmModule.forFeature([CalloutContribution]),
  ],
  providers: [SearchService, SearchResolverQueries],
  exports: [SearchService],
})
export class SearchModule {}
