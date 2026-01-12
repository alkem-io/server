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
import { AgentType } from '@common/enums/agent.type';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ConversationVcResetInput } from './dto/conversation.vc.dto.reset.input';
import { DeleteConversationInput } from './dto/conversation.dto.delete';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { ConversationMembershipService } from '../conversation-membership/conversation.membership.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { UUID } from '@domain/common/scalars';

@InstrumentResolver()
@Resolver()
export class ConversationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationService: ConversationService,
    private guidanceReporterService: GuidanceReporterService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private conversationMembershipService: ConversationMembershipService,
    private subscriptionPublishService: SubscriptionPublishService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ConversationVcAskQuestionResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askVcQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') input: ConversationVcAskQuestionInput
  ): Promise<ConversationVcAskQuestionResult> {
    // Fetch conversation with room relation
    const conversation = await this.conversationService.getConversationOrFail(
      input.conversationID,
      { relations: { room: true } }
    );

    // Get members once for type check and VC resolution
    const members = await this.conversationService.getConversationMembers(
      input.conversationID
    );

    // Validate type: must be USER_VC
    const vcMember = members.find(
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );
    if (!vcMember) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Authorization check
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `conversation VC ask question: ${agentInfo.email}`
    );

    // Resolve VC from already-fetched member
    const vc =
      await this.virtualContributorLookupService.getVirtualContributorByAgentId(
        vcMember.agentId,
        { relations: { agent: true } }
      );
    if (!vc) {
      throw new ValidationException(
        `Could not resolve virtual contributor for conversation: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Call with pre-resolved data
    return this.conversationService.askQuestion(
      conversation,
      vc,
      input.question,
      input.language,
      agentInfo
    );
  }

  @Mutation(() => IConversation, {
    description: 'Resets the interaction with the chat engine.',
  })
  async resetConversationVc(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('input') input: ConversationVcResetInput
  ): Promise<IConversation> {
    // Fetch conversation with room relation (needed for reset)
    const conversation = await this.conversationService.getConversationOrFail(
      input.conversationID,
      { relations: { room: true } }
    );

    // Get members once for both type check and VC resolution
    const members = await this.conversationService.getConversationMembers(
      input.conversationID
    );

    // Validate type: must be USER_VC
    const hasVC = members.some(
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );
    if (!hasVC) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Authorization check
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `conversation VC reset: ${agentInfo.email}`
    );

    // Get VC's agent ID from already-fetched members
    const vcMember = members.find(
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );
    if (!vcMember) {
      throw new ValidationException(
        `Conversation does not have a virtual contributor: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Reset with pre-resolved data (no duplicate queries in service)
    const resetConversation = await this.conversationService.resetConversation(
      conversation,
      agentInfo.agentID,
      vcMember.agentId
    );

    // Update authorization after reset
    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        resetConversation.id
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return await this.conversationService.getConversationOrFail(
      resetConversation.id
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
    // Fetch conversation
    const conversation =
      await this.conversationService.getConversationOrFail(conversationID);

    // Get members once for type check and VC resolution
    const members =
      await this.conversationService.getConversationMembers(conversationID);

    // Validate type: must be USER_VC
    const vcMember = members.find(
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );
    if (!vcMember) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Authorization check
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `conversation VC feedback: ${agentInfo.email}`
    );

    // Resolve VC from already-fetched member
    const vc =
      await this.virtualContributorLookupService.getVirtualContributorByAgentId(
        vcMember.agentId
      );
    if (!vc) {
      throw new ValidationException(
        `Could not resolve virtual contributor for conversation: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    return this.guidanceReporterService.updateAnswerRelevance(
      vc.id,
      id,
      relevant
    );
  }

  @Mutation(() => IConversation, {
    description:
      'Deletes a Conversation. The Matrix room is only deleted if no reciprocal conversation exists.',
  })
  async deleteConversation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteConversationInput
  ): Promise<IConversation> {
    const conversation = await this.conversationService.getConversationOrFail(
      deleteData.ID,
      {
        relations: {
          authorization: true,
        },
      }
    );

    // Authorization check - user must have delete permission on the conversation
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete conversation: ${conversation.id}`
    );

    return await this.conversationService.deleteConversation(conversation.id);
  }

  @Mutation(() => Boolean, {
    description:
      'Marks a conversation as read for the current user, updating the lastReadAt timestamp.',
  })
  async markConversationAsRead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('conversationId', { type: () => UUID }) conversationId: string
  ): Promise<boolean> {
    // Fetch conversation to verify it exists and get authorization
    const conversation = await this.conversationService.getConversationOrFail(
      conversationId,
      {
        relations: {
          authorization: true,
        },
      }
    );

    // Authorization check - user must have read permission on the conversation
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      conversation.authorization,
      AuthorizationPrivilege.READ,
      `mark conversation as read: ${conversation.id}`
    );

    // Update lastReadAt for this user's membership
    await this.conversationMembershipService.updateLastReadAt(
      conversationId,
      agentInfo.agentID
    );

    // Recalculate and publish the updated unread count
    const unreadCount =
      await this.conversationMembershipService.getUnreadConversationsCount(
        agentInfo.agentID
      );
    await this.subscriptionPublishService.publishConversationsUnreadCount(
      agentInfo.userID,
      unreadCount
    );

    return true;
  }
}
