import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceService } from './chat.guidance.service';
import { IChatGuidanceResult } from './dto/chat.guidance.result.dto';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Resolver()
export class ChatGuidanceResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private chatGuidanceService: ChatGuidanceService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChatGuidanceResult, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult | undefined> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return undefined;
    }
    return this.chatGuidanceService.resetUserHistory(agentInfo);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IChatGuidanceResult, {
    description: 'Resets the interaction with the chat engine.',
  })
  @Profiling.api
  async ingest(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IChatGuidanceResult | undefined> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Access interactive guidance: ${agentInfo.email}`
    );
    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return undefined;
    }
    return this.chatGuidanceService.ingest();
  }
}
