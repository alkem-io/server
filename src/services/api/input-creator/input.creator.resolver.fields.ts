import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { InputCreatorQueryResults } from './dto/input.creator.query.results';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PostService } from '@domain/collaboration/post/post.service';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';

@Resolver(() => InputCreatorQueryResults)
export class InputCreatorResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    private postService: PostService,
    private calloutService: CalloutService,
    private innovationFlowService: InnovationFlowService,
    private communityGuidelinesService: CommunityGuidelinesService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ICommunityGuidelines, {
    nullable: true,
    description: 'InputCreator the specified Community guidelines',
  })
  async communityGuidelines(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICommunityGuidelines> {
    const guidelines =
      await this.communityGuidelinesService.getCommunityGuidelinesOrFail(id);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      guidelines.authorization,
      AuthorizationPrivilege.READ,
      `inputCreator Community guidelines: ${guidelines.id}`
    );

    return guidelines;
  }
}
