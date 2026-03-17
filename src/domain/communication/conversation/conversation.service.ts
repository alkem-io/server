import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Actor } from '@domain/actor/actor/actor.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Room } from '@domain/communication/room/room.entity';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomAuthorizationService } from '@domain/communication/room/room.service.authorization';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { FindOneOptions, In, Repository } from 'typeorm';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';

/**
 * Extended membership type that includes actor type information.
 * Used by getConversationMembers to provide type info
 * without requiring a separate actor relation on ConversationMembership.
 */
interface IConversationMembershipWithActorType extends IConversationMembership {
  actorType?: ActorType;
}

@Injectable()
export class ConversationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private roomAuthorizationService: RoomAuthorizationService,
    private userLookupService: UserLookupService,
    private virtualActorLookupService: VirtualActorLookupService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private communicationAdapter: CommunicationAdapter,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMembership)
    private conversationMembershipRepository: Repository<ConversationMembership>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  /**
   * Create a conversation with N members.
   * Works for both DIRECT (2 members) and GROUP (N members) conversations.
   * Deduplicates member IDs. Validates at least 2 members.
   *
   * For DIRECT conversations, the caller is responsible for dedup checks
   * (see findConversationBetweenActors).
   *
   * @param creatorActorId - Actor ID of the creator (auto-included as member)
   * @param memberActorIds - Actor IDs of the other members
   * @param roomType - CONVERSATION_DIRECT or CONVERSATION_GROUP
   * @returns The created conversation
   */
  public async createConversation(
    creatorActorId: string,
    memberActorIds: string[],
    roomType: RoomType,
    displayName?: string,
    avatarUrl?: string
  ): Promise<IConversation> {
    const allMemberIds = [...new Set([creatorActorId, ...memberActorIds])];

    if (allMemberIds.length < 2) {
      throw new ValidationException(
        'Conversations require at least 2 members',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Create conversation entity
    const conversation: IConversation = Conversation.create();
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Create room
    conversation.room = await this.createConversationRoom(
      allMemberIds,
      roomType,
      displayName,
      avatarUrl
    );

    // Save conversation to get ID
    const savedConversation = await this.conversationRepository.save(
      conversation as Conversation
    );

    // Create membership records for all members
    const memberships = allMemberIds.map(actorID =>
      this.conversationMembershipRepository.create({
        conversationId: savedConversation.id,
        actorID,
      })
    );
    await this.conversationMembershipRepository.save(memberships);

    this.logger.verbose?.(
      `Created ${roomType} conversation ${savedConversation.id} with ${allMemberIds.length} members`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return savedConversation;
  }

  /**
   * Create a room for a conversation.
   * Handles both direct (sender/receiver) and group (N members) room creation.
   */
  private async createConversationRoom(
    memberActorIDs: string[],
    roomType: RoomType,
    displayName?: string,
    avatarUrl?: string
  ): Promise<IRoom> {
    if (roomType === RoomType.CONVERSATION_DIRECT) {
      return await this.roomService.createRoom({
        displayName: `conversation-${memberActorIDs[0]}-${memberActorIDs[1]}`,
        type: roomType,
        senderActorID: memberActorIDs[0],
        receiverActorID: memberActorIDs[1],
      });
    }
    return await this.roomService.createRoom({
      displayName:
        displayName || `group-conversation-${memberActorIDs.length}-members`,
      type: roomType,
      memberActorIDs,
      avatarUrl,
    });
  }

  public async getConversationOrFail(
    conversationID: string,
    options?: FindOneOptions<Conversation>
  ): Promise<IConversation | never> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationID },
      ...options,
    });

    if (!conversation)
      throw new EntityNotFoundException(
        'Conversation not found',
        LogContext.COMMUNICATION_CONVERSATION,
        { conversationID, options }
      );
    return conversation;
  }

  async save(conversation: IConversation): Promise<IConversation> {
    return await this.conversationRepository.save(conversation);
  }

  /**
   * Add a member to a group conversation.
   * Sends RPC to Matrix only — DB persistence happens via room.member.updated event.
   */
  public async addMember(
    conversationId: string,
    memberActorId: string
  ): Promise<IConversation> {
    const conversation = await this.getConversationOrFail(conversationId, {
      relations: { room: true },
    });

    if (
      !conversation.room ||
      conversation.room.type !== RoomType.CONVERSATION_GROUP
    ) {
      throw new ValidationException(
        'Cannot add members to a non-group conversation',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Idempotent — skip if already a member
    const alreadyMember = await this.isConversationMember(
      conversationId,
      memberActorId
    );
    if (alreadyMember) {
      return conversation;
    }

    // Send to Matrix only — DB will be updated when room.member.updated event arrives
    await this.communicationAdapter.batchAddMember(memberActorId, [
      conversation.room.id,
    ]);

    this.logger.verbose?.(
      `Sent add-member RPC for ${memberActorId} to group conversation ${conversationId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return conversation;
  }

  /**
   * Remove a member from a group conversation.
   * Sends RPC to Matrix only — DB persistence and auto-delete happen via room.member.updated event.
   */
  public async removeMember(
    conversationId: string,
    memberActorId: string
  ): Promise<IConversation> {
    const conversation = await this.getConversationOrFail(conversationId, {
      relations: { room: true },
    });

    if (
      !conversation.room ||
      conversation.room.type !== RoomType.CONVERSATION_GROUP
    ) {
      throw new ValidationException(
        'Cannot remove members from a non-group conversation',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    const isMember = await this.isConversationMember(
      conversationId,
      memberActorId
    );
    if (!isMember) {
      throw new ValidationException(
        'Actor is not a member of this conversation',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Send to Matrix only — DB will be updated when room.member.updated event arrives
    await this.communicationAdapter.batchRemoveMember(memberActorId, [
      conversation.room.id,
    ]);

    this.logger.verbose?.(
      `Sent remove-member RPC for ${memberActorId} from group conversation ${conversationId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return conversation;
  }

  /**
   * Persist a membership addition. Called from the event handler when
   * a room.member.updated event with membership=join is received.
   */
  public async persistMemberAdded(
    conversationId: string,
    memberActorId: string
  ): Promise<void> {
    const alreadyMember = await this.isConversationMember(
      conversationId,
      memberActorId
    );
    if (alreadyMember) return;

    const membership = this.conversationMembershipRepository.create({
      conversationId,
      actorID: memberActorId,
    });
    await this.conversationMembershipRepository.save(membership);

    this.logger.verbose?.(
      `Persisted member ${memberActorId} added to conversation ${conversationId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );
  }

  /**
   * Persist a membership removal. Called from the event handler when
   * a room.member.updated event with membership=leave is received.
   * @returns The remaining member count.
   */
  public async persistMemberRemoved(
    conversationId: string,
    memberActorId: string
  ): Promise<number> {
    await this.conversationMembershipRepository.delete({
      conversationId,
      actorID: memberActorId,
    });

    this.logger.verbose?.(
      `Persisted member ${memberActorId} removed from conversation ${conversationId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return this.conversationMembershipRepository.count({
      where: { conversationId },
    });
  }

  public async deleteConversation(
    conversationID: string
  ): Promise<IConversation> {
    const conversation = await this.getConversationOrFail(conversationID, {
      relations: {
        room: true,
        messaging: true,
      },
    });

    if (
      !conversation.room ||
      !conversation.authorization ||
      !conversation.messaging
    ) {
      throw new EntityNotInitializedException(
        `Unable to load conversation for deleting: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Note: Conversations now belong to the platform Messaging, not to a user.
    // Memberships are cleaned up via cascade when the conversation is deleted.

    // Delete the room entity
    const room = conversation.room;
    // For direct messaging rooms, provide sender/receiver IDs to handle Matrix cleanup
    this.logger.verbose?.(
      `Deleting conversation room (${room.id}) of type (${room.type})`,
      LogContext.COMMUNICATION_CONVERSATION
    );
    // The Matrix adapter handles room type internally
    await this.roomService.deleteRoom({
      roomID: conversation.room.id,
    });

    await this.authorizationPolicyService.delete(conversation.authorization);

    const result = await this.conversationRepository.remove(
      conversation as Conversation
    );
    result.id = conversationID;

    return result;
  }

  /**
   * Get the room for a conversation.
   */
  public async getRoom(conversationID: string): Promise<IRoom> {
    const conversation = await this.getConversationOrFail(conversationID, {
      relations: { room: true },
    });
    return conversation.room;
  }

  /**
   * LEGACY MIGRATION: Create a room for a conversation that doesn't have one.
   *
   * This method is ONLY used by the adminCommunicationMigrateOrphanedConversations
   * mutation to bulk-create rooms for legacy conversations.
   *
   * TODO: Delete this method after migration has been run on all environments.
   */
  public async ensureRoomExists(
    conversation: IConversation
  ): Promise<IRoom | undefined> {
    // Room already exists
    if (conversation.room) {
      return conversation.room;
    }

    // Load conversation with authorization for room creation
    const conversationWithAuth = await this.getConversationOrFail(
      conversation.id,
      { relations: { authorization: true } }
    );

    // Get the two members of the conversation
    const members = await this.getConversationMembers(conversation.id);
    if (members.length !== 2) {
      this.logger.warn(
        `Cannot create room for conversation ${conversation.id}: expected 2 members, found ${members.length}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return undefined;
    }

    const [member1, member2] = members;

    this.logger.verbose?.(
      `[LEGACY MIGRATION] Creating room for conversation ${conversation.id}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    // Create the room
    const createdRoom = await this.createConversationRoom(
      [member1.actorID, member2.actorID],
      RoomType.CONVERSATION_DIRECT
    );

    conversationWithAuth.room = createdRoom as Room;
    await this.save(conversationWithAuth);

    // Apply authorization to the new room
    if (conversationWithAuth.authorization) {
      let roomAuth = this.roomAuthorizationService.applyAuthorizationPolicy(
        createdRoom,
        conversationWithAuth.authorization
      );
      roomAuth =
        this.roomAuthorizationService.allowContributorsToCreateMessages(
          roomAuth
        );
      roomAuth =
        this.roomAuthorizationService.allowContributorsToReplyReactToMessages(
          roomAuth
        );
      await this.authorizationPolicyService.save(roomAuth);
    }

    return createdRoom;
  }

  public async getCommentsCount(conversationID: string): Promise<number> {
    const room = await this.getRoom(conversationID);
    if (!room) return 0;
    return room.messagesCount;
  }

  /**
   * Reset a conversation by deleting its room and creating a fresh one.
   * Caller is responsible for validation (type check, ownership check).
   * @param conversation - Pre-fetched conversation with room relation
   * @param senderActorID - Actor ID of the sender (initiator)
   * @param receiverActorID - Actor ID of the receiver
   */
  public async resetConversation(
    conversation: IConversation,
    senderActorID: string,
    receiverActorID: string
  ): Promise<IConversation> {
    if (conversation.room) {
      await this.roomService.deleteRoom({
        roomID: conversation.room.id,
      });
    }

    // Create a new room
    conversation.room = await this.createConversationRoom(
      [senderActorID, receiverActorID],
      RoomType.CONVERSATION_DIRECT
    );
    return await this.save(conversation);
  }

  /**
   * Get all members of a conversation via the pivot table.
   * Performance: Queries are limited to 2 members per conversation by domain constraint.
   * Consider DataLoader batching for GraphQL resolvers when querying multiple conversations.
   * @param conversationId - UUID of the conversation
   * @returns Array of conversation memberships with agent relationships loaded
   */
  async getConversationMembers(
    conversationId: string
  ): Promise<IConversationMembershipWithActorType[]> {
    const memberships = await this.conversationMembershipRepository.find({
      loadEagerRelations: false,
      where: { conversationId },
      select: {
        conversationId: true,
        actorID: true,
      },
    });

    // Batch-lookup actor types from the Actor table
    const actorIDs = [...new Set(memberships.map(m => m.actorID))];
    const actorTypeMap = new Map<string, ActorType>();
    if (actorIDs.length > 0) {
      const actors = await this.conversationMembershipRepository.manager.find(
        Actor,
        {
          where: { id: In(actorIDs) },
          select: { id: true, type: true },
        }
      );
      for (const actor of actors) {
        actorTypeMap.set(actor.id, actor.type);
      }
    }

    // Enrich memberships with actor type
    return memberships.map(m => ({
      ...m,
      actorType: actorTypeMap.get(m.actorID),
    }));
  }

  /**
   * Check if an actor is a member of a conversation.
   * @param conversationId - UUID of the conversation
   * @param actorID - UUID of the actor
   * @returns true if the actor is a member, false otherwise
   */
  async isConversationMember(
    conversationId: string,
    actorID: string
  ): Promise<boolean> {
    const count = await this.conversationMembershipRepository.count({
      where: { conversationId, actorID },
    });
    return count > 0;
  }

  /**
   * Find an existing conversation between two actors.
   * Uses the pivot table to find conversations where both actors are members.
   * Performance: Self-join on pivot table with indexed foreign keys provides efficient lookups.
   * Query execution: < 10ms typical for indexed actor_id columns.
   * @param actorId1 - UUID of first actor
   * @param actorId2 - UUID of second actor
   * @returns The conversation if found, null otherwise
   */
  async findConversationBetweenActors(
    actorId1: string,
    actorId2: string
  ): Promise<IConversation | null> {
    const result = await this.conversationMembershipRepository
      .createQueryBuilder('m1')
      .innerJoin(
        'conversation_membership',
        'm2',
        'm1.conversationId = m2.conversationId AND m1.actorID != m2.actorID'
      )
      .innerJoinAndSelect('m1.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      .innerJoin('conversation.room', 'room')
      .where('m1.actorID = :actorId1', { actorId1 })
      .andWhere('m2.actorID = :actorId2', { actorId2 })
      .andWhere('room.type = :roomType', {
        roomType: RoomType.CONVERSATION_DIRECT,
      })
      .getOne();

    return result?.conversation || null;
  }

  /**
   * Find a conversation between a user and a well-known virtual contributor.
   * Uses the efficient findConversationBetweenActors query.
   * @param userID - UUID of the user
   * @param wellKnown - The well-known VC enum value
   * @returns The conversation if found, null otherwise
   */
  /**
   * Resolve a well-known VC to its agent ID.
   */
  async resolveWellKnownVCActorId(
    wellKnown: VirtualContributorWellKnown
  ): Promise<string> {
    const vcId =
      await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
        wellKnown
      );
    if (!vcId) {
      throw new ValidationException(
        'Well-known virtual contributor not found',
        LogContext.COMMUNICATION_CONVERSATION,
        { wellKnown }
      );
    }
    const vc =
      await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
        vcId
      );
    return vc.id;
  }

  async findConversationWithWellKnownVC(
    userID: string,
    wellKnown: VirtualContributorWellKnown
  ): Promise<IConversation | null> {
    // Resolve well-known VC to concrete VC ID
    const vcId =
      await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
        wellKnown
      );
    if (!vcId) {
      return null;
    }

    // Get user's actor ID (user.id IS the actor ID in the new model)
    const user = await this.userLookupService.getUserByIdOrFail(userID);
    const userActorId = user.id;

    // Get VC's actor ID (vc.id IS the actor ID in the new model)
    const vc =
      await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
        vcId
      );
    const vcActorId = vc.id;

    // Use efficient self-join query
    return this.findConversationBetweenActors(userActorId, vcActorId);
  }

  /**
   * T074: Get the virtual contributor from a conversation via membership resolution.
   * Replaces direct access to conversation.virtualContributorID (column dropped).
   * VC resolved from conversation memberships; wellKnownVirtualContributor property
   * now on VirtualContributor entity (not Conversation).
   * @param conversationId - UUID of the conversation
   * @returns The virtual contributor if found, null if conversation has no VC member
   */
  async getVCFromConversation(
    conversationId: string
  ): Promise<IVirtualContributor | null> {
    const members = await this.getConversationMembers(conversationId);
    const vcMember = members.find(
      m => m.actorType === ActorType.VIRTUAL_CONTRIBUTOR
    );

    if (!vcMember) {
      return null;
    }

    // Resolve VC from actor ID
    return await this.virtualActorLookupService.getVirtualContributorById(
      vcMember.actorID
    );
  }

  /**
   * T075: Get the user from a conversation via membership resolution.
   * Replaces direct access to conversation.userID (column dropped).
   * @param conversationId - UUID of the conversation
   * @param excludeActorId - Optional actor ID to exclude (for finding "the other user")
   * @returns The user if found, null if conversation has no user member (or only excluded user)
   */
  async getUserFromConversation(
    conversationId: string,
    excludeActorId?: string
  ): Promise<IUser | null> {
    const members = await this.getConversationMembers(conversationId);

    // Find a user member, excluding the specified actor if provided
    const userMember = members.find(
      m =>
        m.actorType === ActorType.USER &&
        (!excludeActorId || m.actorID !== excludeActorId)
    );

    if (!userMember) {
      return null;
    }

    return await this.userLookupService.getUserById(userMember.actorID);
  }

  /**
   * T076: Get all conversation participants grouped by type.
   * @param conversationId - UUID of the conversation
   * @returns Object with users and virtualContributors arrays
   */
  async getConversationParticipants(conversationId: string): Promise<{
    users: IUser[];
    virtualContributors: IVirtualContributor[];
  }> {
    const members = await this.getConversationMembers(conversationId);

    const users: IUser[] = [];
    const virtualContributors: IVirtualContributor[] = [];

    for (const member of members) {
      if (member.actorType === ActorType.USER) {
        const user = await this.userLookupService.getUserById(member.actorID);
        if (user) users.push(user);
      } else if (member.actorType === ActorType.VIRTUAL_CONTRIBUTOR) {
        const vc =
          await this.virtualActorLookupService.getVirtualContributorById(
            member.actorID
          );
        if (vc) virtualContributors.push(vc);
      }
    }

    return { users, virtualContributors };
  }

  /**
   * Find a conversation by its room ID.
   * Used for mapping room events to conversation events.
   * @param roomId - UUID of the room
   * @returns The conversation if found, null otherwise
   */
  async findConversationByRoomId(
    roomId: string
  ): Promise<IConversation | null> {
    return await this.conversationRepository.findOne({
      where: { room: { id: roomId } },
      relations: {
        room: true,
        authorization: true,
      },
    });
  }

  /**
   * Get all member actor IDs for a conversation.
   * Lightweight version of getConversationMembers that returns only IDs.
   * Used for subscription event filtering.
   * @param conversationId - UUID of the conversation
   * @returns Array of actor IDs
   */
  async getConversationMemberActorIds(
    conversationId: string
  ): Promise<string[]> {
    const memberships = await this.conversationMembershipRepository.find({
      where: { conversationId },
      select: ['actorID'],
    });
    return memberships.map(m => m.actorID);
  }

  /**
   * Find all conversations that don't have a room.
   * Used by admin migration to bulk-create rooms for legacy conversations.
   * @returns Array of conversations without rooms
   */
  async findConversationsWithoutRooms(): Promise<IConversation[]> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.room', 'room')
      .where('conversation.roomId IS NULL')
      .getMany();
  }
}
