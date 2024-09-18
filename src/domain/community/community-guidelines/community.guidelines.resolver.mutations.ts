import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ICommunityGuidelines } from './community.guidelines.interface';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { UpdateCommunityGuidelinesEntityInput } from './dto/community.guidelines.dto.update.entity';

@Resolver()
export class CommunityGuidelinesResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunityGuidelines, {
    description: 'Updates the CommunityGuidelines.',
  })
  @Profiling.api
  async updateCommunityGuidelines(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('communityGuidelinesData')
    communityGuidelinesData: UpdateCommunityGuidelinesEntityInput
  ): Promise<ICommunityGuidelines> {
    const communityGuidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
        communityGuidelinesData.communityGuidelinesID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communityGuidelines.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateCommunityGuidelines: ${communityGuidelines.id}`
    );

    return await this.communityGuidelinesService.update(
      communityGuidelines,
      communityGuidelinesData
    );
  }
}
