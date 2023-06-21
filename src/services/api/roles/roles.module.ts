import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { HubModule } from '@domain/challenge/hub/hub.module';
import { RolesService } from './roles.service';
import { RolesResolverQueries } from './roles.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { HubFilterModule } from '@services/infrastructure/hub-filter/hub.filter.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
    UserGroupModule,
    ChallengeModule,
    OpportunityModule,
    CommunityModule,
    OrganizationModule,
    HubModule,
    PlatformAuthorizationPolicyModule,
    HubFilterModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([Challenge]),
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [RolesService, RolesResolverQueries],
  exports: [RolesService],
})
export class RolesModule {}
