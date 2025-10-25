import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from './conversation.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationService } from './conversation.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { ConversationAgentAnswerRelevanceInput } from './dto/conversation.agent.dto.relevance.update';
import { ConversationAgentAskQuestionInput } from './dto/conversation.agent.dto.ask.question.input';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter/guidance.reporter.service';
import { ConversationAgentAskQuestionResult } from './dto/conversation.agent.dto.ask.question.result';

@InstrumentResolver()
@Resolver()
export class ConversationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationService: ConversationService,
    private guidanceReporterService: GuidanceReporterService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ConversationAgentAskQuestionResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askChatGuidanceQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ConversationAgentAskQuestionInput
  ): Promise<ConversationAgentAskQuestionResult> {
    const conversation = await this.conversationService.getConversationOrFail(
      chatData.conversationID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.UPDATE,
      `Access interactive guidance: ${agentInfo.email}`
    );

    return this.conversationService.askQuestion(chatData, agentInfo);
  }

  @Mutation(() => IConversation, {
    description: 'Resets the interaction with the chat engine.',
  })
  async resetChatGuidance(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ConversationAgentAskQuestionInput
  ): Promise<IConversation> {
    let conversation = await this.conversationService.getConversationOrFail(
      chatData.conversationID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.UPDATE,
      `Access interactive guidance: ${agentInfo.email}`
    );
    conversation =
      await this.conversationService.resetUserConversationWithAgent(
        agentInfo,
        conversation.id
      );
    // Update authorization after reset
    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        conversation.id,
        conversation.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return await this.conversationService.getConversationOrFail(
      conversation.id
    );
  }

  @Mutation(() => Boolean, {
    description: 'User vote if a specific answer is relevant.',
  })
  public updateAnswerRelevance(
    @Args('input') { id, relevant }: ConversationAgentAnswerRelevanceInput
  ): Promise<boolean> {
    return this.guidanceReporterService.updateAnswerRelevance(id, relevant);
  }
}
