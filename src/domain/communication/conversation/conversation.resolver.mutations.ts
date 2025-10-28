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
import { ConversationVcAnswerRelevanceInput } from './dto/conversation.vc.dto.relevance.update';
import { ConversationVcAskQuestionInput } from './dto/conversation.vc.dto.ask.question.input';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter/guidance.reporter.service';
import { ConversationVcAskQuestionResult } from './dto/conversation.vc.dto.ask.question.result';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';

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

  @Mutation(() => ConversationVcAskQuestionResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askVcQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ConversationVcAskQuestionInput
  ): Promise<ConversationVcAskQuestionResult> {
    const conversation = await this.conversationService.getConversationOrFail(
      chatData.conversationID
    );
    if (conversation.type !== CommunicationConversationType.USER_VC) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.UPDATE,
      `conversation VC ask question: ${agentInfo.email}`
    );

    return this.conversationService.askQuestion(chatData, agentInfo);
  }

  @Mutation(() => IConversation, {
    description: 'Resets the interaction with the chat engine.',
  })
  async resetConversationVc(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ConversationVcAskQuestionInput
  ): Promise<IConversation> {
    let conversation = await this.conversationService.getConversationOrFail(
      chatData.conversationID
    );
    if (conversation.type !== CommunicationConversationType.USER_VC) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.UPDATE,
      `conversation VC reset: ${agentInfo.email}`
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
  public async feedbackOnVcAnswerRelevance(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input')
    { id, relevant, conversationID }: ConversationVcAnswerRelevanceInput
  ): Promise<boolean> {
    const conversation =
      await this.conversationService.getConversationOrFail(conversationID);
    if (conversation.type !== CommunicationConversationType.USER_VC) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }
    if (!conversation.virtualContributorID) {
      throw new ValidationException(
        `Conversation does not have a virtual contributor: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.UPDATE,
      `conversation VC reset: ${agentInfo.email}`
    );

    return this.guidanceReporterService.updateAnswerRelevance(
      conversation.virtualContributorID,
      id,
      relevant
    );
  }
}
