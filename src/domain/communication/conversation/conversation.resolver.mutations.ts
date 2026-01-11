import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from './conversation.interface';
import { ActorContext } from '@core/actor-context';
import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationService } from './conversation.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { ConversationVcAnswerRelevanceInput } from './dto/conversation.vc.dto.relevance.update';
import { GuidanceReporterService } from '@services/external/elasticsearch/guidance-reporter/guidance.reporter.service';
import { ActorType } from '@common/enums/actor.type';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ConversationVcResetInput } from './dto/conversation.vc.dto.reset.input';
import { DeleteConversationInput } from './dto/conversation.dto.delete';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Resets the interaction with the chat engine.',
  })
  async resetConversationVc(
    @CurrentActor() actorContext: ActorContext,
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
    const hasVC = members.some(m => m.actor?.type === ActorType.VIRTUAL);
    if (!hasVC) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Authorization check
    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `conversation VC reset: ${actorContext.actorId}`
    );

    // Get VC's actor ID from already-fetched members
    const vcMember = members.find(m => m.actor?.type === ActorType.VIRTUAL);
    if (!vcMember) {
      throw new ValidationException(
        `Conversation does not have a virtual contributor: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Reset with pre-resolved data (no duplicate queries in service)
    const resetConversation = await this.conversationService.resetConversation(
      conversation,
      actorContext.actorId,
      vcMember.actorId
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
    @CurrentActor() actorContext: ActorContext,
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
    const vcMember = members.find(m => m.actor?.type === ActorType.VIRTUAL);
    if (!vcMember) {
      throw new ValidationException(
        `Conversation is not a USER_VC type: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Authorization check
    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `conversation VC feedback: ${actorContext.actorId}`
    );

    // Resolve VC from already-fetched member
    // VirtualContributor IS an Actor - vc.id is the actorId
    const vc =
      await this.virtualContributorLookupService.getVirtualContributorById(
        vcMember.actorId
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
    @CurrentActor() actorContext: ActorContext,
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
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete conversation: ${conversation.id}`
    );

    return await this.conversationService.deleteConversation(conversation.id);
  }
}
