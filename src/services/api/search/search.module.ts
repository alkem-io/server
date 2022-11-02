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
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    UserModule,
    UserGroupModule,
    OrganizationModule,
    ChallengeModule,
    HubModule,
    OpportunityModule,
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([UserGroup]),
    TypeOrmModule.forFeature([Organization]),
    TypeOrmModule.forFeature([Hub]),
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [SearchService, SearchResolverQueries],
  exports: [SearchService],
})
export class SearchModule {}
