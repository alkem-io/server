import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ActorType } from '@common/enums/actor.type';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';

@Injectable()
export class ConversationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private actorLookupService: ActorLookupService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMembership)
    private conversationMembershipRepository: Repository<ConversationMembership>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  /**
   * Create a conversation between two actors.
   * This is the core creation method that works purely with actor IDs.
   * Callers are responsible for resolving user/VC IDs to actor IDs.
   *
   * @param callerActorId - Actor ID of the caller/initiator
   * @param receiverActorId - Actor ID of the receiver (user or VC)
   * @returns The created or existing conversation
   */
  public async createConversation(
    callerActorId: string,
    receiverActorId: string
  ): Promise<IConversation> {
    // Check if conversation already exists between these actors
    const existingConversation = await this.findConversationBetweenActors(
      callerActorId,
      receiverActorId
    );
    if (existingConversation) {
      this.logger.verbose?.(
        `Returning existing conversation ${existingConversation.id} between actors ${callerActorId} and ${receiverActorId}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return existingConversation;
    }

    // Create conversation entity
    const conversation: IConversation = Conversation.create();
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Always create direct room for 1:1 conversations (both USER_USER and USER_VC)
    conversation.room = await this.createConversationRoom(
      callerActorId,
      receiverActorId,
      RoomType.CONVERSATION_DIRECT
    );

    // Save conversation to get ID
    const savedConversation = await this.conversationRepository.save(
      conversation as Conversation
    );

    // Create membership records for both actors
    const membership1 = this.conversationMembershipRepository.create({
      conversationId: savedConversation.id,
      actorId: callerActorId,
    });
    const membership2 = this.conversationMembershipRepository.create({
      conversationId: savedConversation.id,
      actorId: receiverActorId,
    });
    await this.conversationMembershipRepository.save([
      membership1,
      membership2,
    ]);

    this.logger.verbose?.(
      `Created conversation ${savedConversation.id} with memberships for actors: ${callerActorId}, ${receiverActorId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return savedConversation;
  }

  /**
   * Create a room for a conversation between two actors.
   * @param senderActorId - Actor ID of the sender/initiator
   * @param receiverActorId - Actor ID of the receiver
   * @param roomType - Type of room to create
   */
  private async createConversationRoom(
    senderActorId: string,
    receiverActorId: string,
    roomType: RoomType
  ): Promise<IRoom> {
    return await this.roomService.createRoom({
      displayName: `conversation-${senderActorId}-${receiverActorId}`,
      type: roomType,
      senderActorId: senderActorId,
      receiverActorId: receiverActorId,
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
        `No Conversation found with the given id: ${conversationID}, using options: ${JSON.stringify(
          options
        )}`,
        LogContext.COLLABORATION
      );
    return conversation;
  }

  async save(conversation: IConversation): Promise<IConversation> {
    return await this.conversationRepository.save(conversation);
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

  public async getRoom(conversationID: string): Promise<IRoom | undefined> {
    const conversation = await this.getConversationOrFail(conversationID, {
      relations: { room: true },
    });
    return conversation.room;
  }

  /**
   * Reset a conversation by deleting its room and creating a fresh one.
   * Caller is responsible for validation (type check, ownership check).
   * @param conversation - Pre-fetched conversation with room relation
   * @param senderActorId - Actor ID of the sender (initiator)
   * @param receiverActorId - Actor ID of the receiver
   */
  public async resetConversation(
    conversation: IConversation,
    senderActorId: string,
    receiverActorId: string
  ): Promise<IConversation> {
    if (conversation.room) {
      await this.roomService.deleteRoom({
        roomID: conversation.room.id,
      });
    }

    // Create a new direct room
    conversation.room = await this.createConversationRoom(
      senderActorId,
      receiverActorId,
      RoomType.CONVERSATION_DIRECT
    );
    return await this.save(conversation);
  }

  /**
   * Get all members of a conversation via the pivot table.
   * Performance: Queries are limited to 2 members per conversation by domain constraint.
   * Consider DataLoader batching for GraphQL resolvers when querying multiple conversations.
   * @param conversationId - UUID of the conversation
   * @returns Array of conversation memberships (actorId only, use ActorLookupService for types)
   */
  async getConversationMembers(
    conversationId: string
  ): Promise<IConversationMembership[]> {
    return await this.conversationMembershipRepository.find({
      where: { conversationId },
    });
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
        'm1.conversationId = m2.conversationId AND m1.actorId != m2.actorId'
      )
      .innerJoinAndSelect('m1.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      .where('m1.actorId = :actorId1', { actorId1 })
      .andWhere('m2.actorId = :actorId2', { actorId2 })
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

    // User IS an Actor - user.id is the actorId
    const user = await this.userLookupService.getUserByIdOrFail(userID);
    const userActorId = user.id;

    // VirtualContributor IS an Actor - vc.id is the actorId
    const vc =
      await this.virtualContributorLookupService.getVirtualContributorByIdOrFail(
        vcId
      );
    const vcActorId = vc.id;

    // Use efficient self-join query
    return this.findConversationBetweenActors(userActorId, vcActorId);
  }

  /**
   * Infer conversation type from the actor types of its members.
   * Uses ActorLookupService with caching for efficient type lookups.
   * Enforces at most 2 members per conversation (per spec clarification).
   * @param conversationId - UUID of the conversation
   * @returns USER_USER if both are users, USER_VC if one is a VC
   * @throws ValidationException if conversation doesn't have exactly 2 members
   */
  async inferConversationType(
    conversationId: string
  ): Promise<CommunicationConversationType> {
    const members = await this.getConversationMembers(conversationId);

    if (members.length > 2) {
      throw new ValidationException(
        'Conversation must have exactly 2 members',
        LogContext.COMMUNICATION,
        {
          details: {
            conversationId,
            memberCount: members.length,
          },
        }
      );
    }

    // Get actor types using cached lookup
    const actorIds = members.map(m => m.actorId);
    const typeMap = await this.actorLookupService.validateActorsAndGetTypes(actorIds);

    // Check if any actor is a virtual contributor
    const hasVC = actorIds.some(id => typeMap.get(id) === ActorType.VIRTUAL);

    return hasVC
      ? CommunicationConversationType.USER_VC
      : CommunicationConversationType.USER_USER;
  }

  /**
   * T075: Get the user from a conversation via membership resolution.
   * Uses ActorLookupService for type lookups instead of loading actor relation.
   * @param conversationId - UUID of the conversation
   * @param excludeActorId - Optional actor ID to exclude (for finding "the other user")
   * @returns The user if found, null if conversation has no user member (or only excluded user)
   */
  async getUserFromConversation(
    conversationId: string,
    excludeActorId?: string
  ): Promise<IUser | null> {
    const members = await this.getConversationMembers(conversationId);

    // Get actor types using cached lookup
    const actorIds = members.map(m => m.actorId);
    const typeMap = await this.actorLookupService.validateActorsAndGetTypes(actorIds);

    // Find a user member, excluding the specified actor if provided
    const userMember = members.find(
      m =>
        typeMap.get(m.actorId) === ActorType.USER &&
        (!excludeActorId || m.actorId !== excludeActorId)
    );

    if (!userMember) {
      return null;
    }

    // User IS an Actor - lookup by actorId
    return await this.userLookupService.getUserById(userMember.actorId);
  }
}
