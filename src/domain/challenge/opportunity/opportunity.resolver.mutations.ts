import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import {} from '@domain/context/actor-group';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { OpportunityService } from './opportunity.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { IOpportunity } from './opportunity.interface';
import { DeleteOpportunityInput, UpdateOpportunityInput } from './dto';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { EntityNotInitializedException } from '@common/exceptions';

@Resolver()
export class OpportunityResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private authorizationService: AuthorizationService,
    private opportunityService: OpportunityService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Updates the specified Opportunity.',
  })
  @Profiling.api
  async updateOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('opportunityData') opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityData.ID,
      {
        relations: {
          account: true,
        },
      }
    );
    if (!opportunity.account) {
      throw new EntityNotInitializedException(
        'account no found on opportunity: ${opportunity.nameID}',
        LogContext.CHALLENGES
      );
    }
    const spaceID = opportunity.account.spaceID;
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.UPDATE,
      `update opportunity: ${opportunity.nameID}`
    );

    const updatedOpportunity = await this.opportunityService.updateOpportunity(
      opportunityData
    );

    this.contributionReporter.opportunityContentEdited(
      {
        id: updatedOpportunity.id,
        name: updatedOpportunity.profile.displayName,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedOpportunity;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOpportunity, {
    description: 'Deletes the specified Opportunity.',
  })
  async deleteOpportunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      opportunity.authorization,
      AuthorizationPrivilege.DELETE,
      `delete opportunity: ${opportunity.nameID}`
    );
    return await this.opportunityService.deleteOpportunity(deleteData.ID);
  }
}
