import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ChatGuidanceService } from './chat.guidance.service';
import { ChatGuidanceAnswerRelevanceInput } from './dto/chat.guidance.relevance.dto';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter';

@Resolver()
export class ChatGuidanceResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private chatGuidanceService: ChatGuidanceService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private guidanceReporterService: GuidanceReporterService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return false;
    }
    return this.chatGuidanceService.resetUserHistory(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async ingest(@CurrentUser() agentInfo: AgentInfo): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return false;
    }
    return this.chatGuidanceService.ingest();
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'User vote if a specific answer is relevant.',
  })
  @Profiling.api
  public updateAnswerRelevance(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') { id, relevant }: ChatGuidanceAnswerRelevanceInput
  ): Promise<boolean> {
    return this.guidanceReporterService.updateAnswerRelevance(id, relevant);
  }
}
