import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifeycle for the Opportunity.',
  })
  @Profiling.api
  async lifecycle(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getLifecycle(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the Opportunity.',
  })
  @Profiling.api
  async community(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getCommunity(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the Opportunity.',
  })
  @Profiling.api
  async context(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getContext(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the Opportunity.',
  })
  @Profiling.api
  async collaboration(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getCollaboration(opportunity);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Opportunity.',
  })
  @Profiling.api
  async profile(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getProfile(opportunity);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about the activity within this Opportunity.',
  })
  @Profiling.api
  async metrics(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getMetrics(opportunity);
  }

  @ResolveField('parentNameID', () => String, {
    nullable: true,
    description: 'The parent entity name (challenge) ID.',
  })
  @Profiling.api
  async parentNameID(@Parent() opportunity: IOpportunity) {
    const opp = await this.opportunityService.getOpportunityOrFail(
      opportunity.id,
      {
        relations: ['challenge'],
      }
    );
    return opp.challenge?.nameID;
  }
}
