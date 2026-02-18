import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { DeleteConversationInput } from './dto/conversation.dto.delete';
import { ConversationVcResetInput } from './dto/conversation.vc.dto.reset.input';

@InstrumentResolver()
@Resolver()
export class ConversationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationService: ConversationService,
    private conversationAuthorizationService: ConversationAuthorizationService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Resets the interaction with the VC by recreating the room.',
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
    const hasVC = members.some(m => m.actorType === ActorType.VIRTUAL);
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

    // Get VC's agent ID from already-fetched members
    const vcMember = members.find(m => m.actorType === ActorType.VIRTUAL);
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
