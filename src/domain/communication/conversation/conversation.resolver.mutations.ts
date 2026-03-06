import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorService } from '@domain/actor/actor/actor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InstrumentResolver } from '@src/apm/decorators';
import { randomUUID } from 'crypto';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { AddConversationMemberInput } from './dto/conversation.dto.add-member';
import { DeleteConversationInput } from './dto/conversation.dto.delete';
import { LeaveConversationInput } from './dto/conversation.dto.leave';
import { RemoveConversationMemberInput } from './dto/conversation.dto.remove-member';
import { UpdateConversationInput } from './dto/conversation.dto.update';
import { ConversationVcResetInput } from './dto/conversation.vc.dto.reset.input';

@InstrumentResolver()
@Resolver()
export class ConversationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationService: ConversationService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private actorService: ActorService,
    private roomService: RoomService,
    private subscriptionPublishService: SubscriptionPublishService
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
    const hasVC = members.some(
      m => m.actorType === ActorType.VIRTUAL_CONTRIBUTOR
    );
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
      `conversation VC reset: ${actorContext.actorID}`
    );

    // Get VC's agent ID from already-fetched members
    const vcMember = members.find(
      m => m.actorType === ActorType.VIRTUAL_CONTRIBUTOR
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
      actorContext.actorID,
      vcMember.actorID
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
      'Deletes a Conversation. All members are notified via CONVERSATION_DELETED event.',
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

    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete conversation: ${conversation.id}`
    );

    // Collect all member IDs before deletion for event publishing
    const memberAgentIds =
      await this.conversationService.getConversationMemberAgentIds(
        conversation.id
      );

    const result = await this.conversationService.deleteConversation(
      conversation.id
    );

    // Publish CONVERSATION_DELETED event to all former members
    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds,
      conversationDeleted: {
        conversationID: conversation.id,
      },
    });

    return result;
  }

  @Mutation(() => IConversation, {
    description: 'Add a member to a group conversation.',
  })
  async addConversationMember(
    @CurrentActor() actorContext: ActorContext,
    @Args('memberData') memberData: AddConversationMemberInput
  ): Promise<IConversation> {
    const conversation = await this.conversationService.getConversationOrFail(
      memberData.conversationID,
      { relations: { authorization: true } }
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `add member to conversation: ${conversation.id}`
    );

    const updatedConversation = await this.conversationService.addMember(
      memberData.conversationID,
      memberData.memberID
    );

    // Re-apply authorization policy after membership change
    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        updatedConversation.id
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    // Resolve added member actor for the event
    const addedActor = await this.actorService.getActorOrFail(
      memberData.memberID
    );

    // Publish MEMBER_ADDED event to all current members
    const memberAgentIds =
      await this.conversationService.getConversationMemberAgentIds(
        updatedConversation.id
      );

    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds,
      memberAdded: {
        conversation: updatedConversation,
        addedMember: addedActor,
      },
    });

    return await this.conversationService.getConversationOrFail(
      updatedConversation.id,
      { relations: { authorization: true, room: true } }
    );
  }

  @Mutation(() => IConversation, {
    nullable: true,
    description:
      'Remove a member from a group conversation. Returns null if the conversation was auto-deleted (0 members).',
  })
  async removeConversationMember(
    @CurrentActor() actorContext: ActorContext,
    @Args('memberData') memberData: RemoveConversationMemberInput
  ): Promise<IConversation | null> {
    return this.removeMemberAndPublish(
      actorContext,
      memberData.conversationID,
      memberData.memberID,
      AuthorizationPrivilege.CONTRIBUTE
    );
  }

  @Mutation(() => IConversation, {
    nullable: true,
    description:
      'Leave a group conversation. Returns null if the conversation was auto-deleted (0 members).',
  })
  async leaveConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('leaveData') leaveData: LeaveConversationInput
  ): Promise<IConversation | null> {
    return this.removeMemberAndPublish(
      actorContext,
      leaveData.conversationID,
      actorContext.actorID,
      AuthorizationPrivilege.READ
    );
  }

  @Mutation(() => IConversation, {
    description:
      'Update a group conversation (display name, avatar). Only GROUP conversations support these properties.',
  })
  async updateConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateConversationInput
  ): Promise<IConversation> {
    const conversation = await this.conversationService.getConversationOrFail(
      updateData.conversationID,
      { relations: { authorization: true, room: true } }
    );

    if (
      !conversation.room ||
      conversation.room.type !== RoomType.CONVERSATION_GROUP
    ) {
      throw new ValidationException(
        'Only group conversations can be updated',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `update conversation: ${conversation.id}`
    );

    if (updateData.displayName !== undefined) {
      await this.roomService.updateRoomDisplayName(
        conversation.room,
        updateData.displayName
      );
    }

    if (updateData.avatarUrl !== undefined) {
      await this.roomService.updateRoomAvatar(
        conversation.room,
        updateData.avatarUrl
      );
    }

    return await this.conversationService.getConversationOrFail(
      updateData.conversationID,
      { relations: { authorization: true, room: true } }
    );
  }

  /**
   * Shared logic for removing a member (or self) from a group conversation.
   * Handles auth check, removal, re-applying auth policy, and publishing MEMBER_REMOVED event.
   */
  private async removeMemberAndPublish(
    actorContext: ActorContext,
    conversationId: string,
    memberIdToRemove: string,
    requiredPrivilege: AuthorizationPrivilege
  ): Promise<IConversation | null> {
    const conversation = await this.conversationService.getConversationOrFail(
      conversationId,
      { relations: { authorization: true } }
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      requiredPrivilege,
      `remove member from conversation: ${conversation.id}`
    );

    // Collect member IDs before removal for event publishing
    const memberAgentIdsBefore =
      await this.conversationService.getConversationMemberAgentIds(
        conversationId
      );

    const updatedConversation = await this.conversationService.removeMember(
      conversationId,
      memberIdToRemove
    );

    if (updatedConversation) {
      const authorizations =
        await this.conversationAuthorizationService.applyAuthorizationPolicy(
          updatedConversation.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);
    }

    // Publish MEMBER_REMOVED event to all members (including the removed one)
    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberAgentIds: memberAgentIdsBefore,
      memberRemoved: {
        conversation,
        removedMemberID: memberIdToRemove,
      },
    });

    return updatedConversation
      ? await this.conversationService.getConversationOrFail(
          updatedConversation.id,
          { relations: { authorization: true, room: true } }
        )
      : null;
  }
}
