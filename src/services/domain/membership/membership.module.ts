import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { MembershipService } from './membership.service';
import { MembershipResolverQueries } from './membership.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ApplicationModule,
    UserModule,
    UserGroupModule,
    ChallengeModule,
    OpportunityModule,
    CommunityModule,
    OrganizationModule,
    EcoverseModule,
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [MembershipService, MembershipResolverQueries],
  exports: [MembershipService],
})
export class MembershipModule {}
