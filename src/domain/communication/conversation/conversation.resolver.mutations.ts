import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InstrumentResolver } from '@src/apm/decorators';
import { randomUUID } from 'crypto';
import { IConversation } from './conversation.interface';
import { ConversationRepairService } from './conversation.repair.service';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';
import { AssignConversationMemberInput } from './dto/conversation.dto.add-member';
import { DeleteConversationInput } from './dto/conversation.dto.delete';
import { LeaveConversationInput } from './dto/conversation.dto.leave';
import { RemoveConversationMemberInput } from './dto/conversation.dto.remove-member';
import { RepairConversationRoomInput } from './dto/conversation.dto.repair';
import { UpdateConversationInput } from './dto/conversation.dto.update';
import { ConversationGovernanceEventType } from './dto/conversation.governance.event';
import { ConversationRoomRepairResult } from './dto/conversation.repair.result';
import { ConversationVcResetInput } from './dto/conversation.vc.dto.reset.input';

@InstrumentResolver()
@Resolver()
export class ConversationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private conversationService: ConversationService,
    private conversationAuthorizationService: ConversationAuthorizationService,
    private roomService: RoomService,
    private subscriptionPublishService: SubscriptionPublishService,
    private conversationRepairService: ConversationRepairService
  ) {}

  @Mutation(() => ConversationRoomRepairResult, {
    description:
      'Repair the messaging room of a Conversation the caller can read: ensures the backend room exists (an existing room is reused, never duplicated), converges backend membership to the platform membership, records readiness and reports a typed outcome with counts. Idempotent — repairing a READY room verifies it and changes nothing. Non-members receive FORBIDDEN_POLICY before any backend call; a backend that cannot be reached yields outcome FAILED, never an authorization error; readiness becomes FAILED unless the room was READY, in which case it stays READY because an outage is not evidence the room is missing.',
  })
  async repairConversationRoom(
    @CurrentActor() actorContext: ActorContext,
    @Args('repairData') repairData: RepairConversationRoomInput
  ): Promise<ConversationRoomRepairResult> {
    const conversation = await this.conversationService.getConversationOrFail(
      repairData.conversationID,
      { relations: { authorization: true, room: true } }
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      conversation.authorization,
      AuthorizationPrivilege.READ,
      `repair conversation room: ${conversation.id}`
    );

    return this.conversationRepairService.repair(conversation);
  }

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
    const memberActorIds =
      await this.conversationService.getConversationMemberActorIds(
        conversation.id
      );

    const result = await this.conversationService.deleteConversation(
      conversation.id
    );

    // Publish CONVERSATION_DELETED event to all former members
    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
      conversationDeleted: {
        conversationID: conversation.id,
      },
    });
    await this.subscriptionPublishService.publishConversationGovernanceEvent(
      memberActorIds,
      {
        eventType: ConversationGovernanceEventType.CONVERSATION_DELETED,
        conversationID: conversation.id,
      }
    );

    return result;
  }

  @Mutation(() => Boolean, {
    description:
      'Assign a member to a group conversation. Returns true once the messaging backend accepted the join; ' +
      'the membership row is written when the backend join event arrives — observe MEMBER_ADDED on ' +
      'conversationGovernanceEvents (or conversationEvents) for completion. Not a group, member cap reached, ' +
      'or caller not a member → VALIDATION; invitee blocks messages → MESSAGING_NOT_ENABLED; not permitted → ' +
      'FORBIDDEN_POLICY; backend unreachable → COMMUNICATION_ADAPTER_UNAVAILABLE; backend rejected → FORBIDDEN. ' +
      'Divergence between platform and backend membership is repairable with repairConversationRoom.',
  })
  async assignConversationMember(
    @CurrentActor() actorContext: ActorContext,
    @Args('memberData') memberData: AssignConversationMemberInput
  ): Promise<boolean> {
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

    await this.conversationService.addMember(
      memberData.conversationID,
      memberData.memberID
    );

    return true;
  }

  @Mutation(() => Boolean, {
    description:
      'Remove a member from a group conversation. Awaits the Matrix kick rather than ' +
      'reporting success merely because the RPC was sent: true means the kick was ' +
      'accepted, and the membership is then removed asynchronously — observe ' +
      'MEMBER_REMOVED on conversationGovernanceEvents (or conversationEvents) for completion. ' +
      'If Matrix rejects the kick (e.g. insufficient permissions) this still returns true, because ' +
      'Alkemio is authoritative for its own membership and applies the removal locally instead; on ' +
      'that path the Matrix-side room membership may diverge — the divergence is repairable with ' +
      'repairConversationRoom. Backend unreachable → COMMUNICATION_ADAPTER_UNAVAILABLE.',
  })
  async removeConversationMember(
    @CurrentActor() actorContext: ActorContext,
    @Args('memberData') memberData: RemoveConversationMemberInput
  ): Promise<boolean> {
    return this.removeMemberAndSendRpc(
      actorContext,
      memberData.conversationID,
      memberData.memberID,
      AuthorizationPrivilege.CONTRIBUTE
    );
  }

  @Mutation(() => Boolean, {
    description:
      'Leave a group conversation. Awaits the Matrix kick rather than reporting success ' +
      'merely because the RPC was sent: true means the kick was accepted, and the ' +
      'membership is then removed asynchronously — observe MEMBER_REMOVED on ' +
      'conversationGovernanceEvents (or conversationEvents) for completion. If Matrix rejects the ' +
      'kick this still returns true, because Alkemio is authoritative for its own membership and ' +
      'applies the removal locally instead; on that path the Matrix-side room membership may ' +
      'diverge — the divergence is repairable with repairConversationRoom. If the last member ' +
      'leaves, the conversation is auto-deleted and a CONVERSATION_DELETED event follows.',
  })
  async leaveConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('leaveData') leaveData: LeaveConversationInput
  ): Promise<boolean> {
    return this.removeMemberAndSendRpc(
      actorContext,
      leaveData.conversationID,
      actorContext.actorID,
      AuthorizationPrivilege.READ
    );
  }

  @Mutation(() => Boolean, {
    description:
      'Update a group conversation (display name, avatar). Returns true once the metadata is persisted ' +
      'and the messaging backend accepted the update — observe CONVERSATION_UPDATED on ' +
      'conversationGovernanceEvents (or conversationEvents) for completion; when both fields are ' +
      'provided, clients may receive separate update events for each. Not a group → VALIDATION; ' +
      'not permitted → FORBIDDEN_POLICY; backend unreachable → COMMUNICATION_ADAPTER_UNAVAILABLE.',
  })
  async updateConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('updateData') updateData: UpdateConversationInput
  ): Promise<boolean> {
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

    return true;
  }

  /**
   * Shared logic for removing a member (or self) from a group conversation.
   * Awaits the Matrix kick RPC (ConversationService.removeMember opts into
   * `ensureAllSucceeded`) rather than resolving optimistically on send
   * (US2-AS4). `true` therefore means the removal is under way on one of two
   * paths, both of which complete through the same room.member.updated
   * workflow (membership deletion, auth re-apply, MEMBER_REMOVED, last-member
   * auto-delete) — so clients observe completion via MEMBER_REMOVED, not via
   * this return value:
   *  - Matrix ACCEPTED the kick: the adapter confirms synchronously, the
   *    workflow then runs off the inbound room.member.updated event.
   *  - Matrix REFUSED the kick: the service downgrades it to an authoritative
   *    local removal (sec-server-11) and drives the same workflow itself.
   * Anything else (transport failures, programming errors) propagates as a
   * GraphQL error. There is no resolver try/catch, deliberately.
   */
  private async removeMemberAndSendRpc(
    actorContext: ActorContext,
    conversationId: string,
    memberIdToRemove: string,
    requiredPrivilege: AuthorizationPrivilege
  ): Promise<boolean> {
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

    await this.conversationService.removeMember(
      conversationId,
      memberIdToRemove
    );

    return true;
  }
}
