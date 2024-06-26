import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ChatGuidanceInput } from './dto/chat.guidance.dto.input';
import { ChatGuidanceService } from './chat.guidance.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
@Resolver()
export class ChatGuidanceResolverQueries {
  constructor(
    private chatGuidanceService: ChatGuidanceService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IMessageAnswerToQuestion, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askChatGuidanceQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ChatGuidanceInput
  ): Promise<IMessageAnswerToQuestion> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );

    if (!this.chatGuidanceService.isGuidanceEngineEnabled()) {
      return {
        answer: 'guidance engine not enabled',
        question: chatData.question,
        sources: [],
      };
    }
    return this.chatGuidanceService.askQuestion(chatData, agentInfo);
  }
}
