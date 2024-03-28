import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@domain/challenge/opportunity';
import { OpportunityService } from './opportunity.service';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OpportunityAuthorizationService } from './opportunity.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    BaseChallengeModule,
    ContributionReporterModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [
    OpportunityService,
    OpportunityResolverFields,
    OpportunityResolverMutations,
    OpportunityAuthorizationService,
  ],
  exports: [OpportunityService, OpportunityAuthorizationService],
})
export class OpportunityModule {}
