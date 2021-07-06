import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { EcoverseModule } from '@domain/challenge/ecoverse/ecoverse.module';
import { MembershipService } from './membership.service';
import { MembershipResolverQueries } from './membership.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { ApplicationModule } from '@domain/community/application/application.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    ApplicationModule,
    UserModule,
    UserGroupModule,
    ChallengeModule,
    OpportunityModule,
    CommunityModule,
    OrganisationModule,
    EcoverseModule,
  ],
  providers: [MembershipService, MembershipResolverQueries],
  exports: [MembershipService],
})
export class MembershipModule {}
