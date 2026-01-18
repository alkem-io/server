import { LogContext } from '@common/enums';
import { AgentType } from '@common/enums/agent.type';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { RoomType } from '@common/enums/room.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
import { ConversationVcAskQuestionResult } from './dto/conversation.vc.dto.ask.question.result';

@Injectable()
export class ConversationService {
  constructor(
    private aiServerAdapter: AiServerAdapter,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private roomLookupService: RoomLookupService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
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
   * Create a conversation between two agents.
   * This is the core creation method that works purely with agent IDs.
   * Callers are responsible for resolving user/VC IDs to agent IDs.
   *
   * @param currentUserAgentId - Agent ID of the current user
   * @param otherAgentId - Agent ID of the other party (user or VC)
   * @param createRoom - Whether to create a room (true for USER_USER, false for USER_VC)
   * @returns The created or existing conversation
   */
  public async createConversation(
    currentUserAgentId: string,
    otherAgentId: string,
    createRoom: boolean
  ): Promise<IConversation> {
    // Check if conversation already exists between these agents
    const existingConversation = await this.findConversationBetweenAgents(
      currentUserAgentId,
      otherAgentId
    );
    if (existingConversation) {
      this.logger.verbose?.(
        `Returning existing conversation ${existingConversation.id} between agents ${currentUserAgentId} and ${otherAgentId}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return existingConversation;
    }

    // Create conversation entity
    const conversation: IConversation = Conversation.create();
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Create room only for USER_USER conversations
    // USER_VC rooms are created on-demand when first message is sent
    if (createRoom) {
      conversation.room = await this.createConversationRoom(
        currentUserAgentId,
        otherAgentId,
        RoomType.CONVERSATION_DIRECT
      );
    }

    // Save conversation to get ID
    const savedConversation = await this.conversationRepository.save(
      conversation as Conversation
    );

    // Create membership records for both agents
    const membership1 = this.conversationMembershipRepository.create({
      conversationId: savedConversation.id,
      agentId: currentUserAgentId,
    });
    const membership2 = this.conversationMembershipRepository.create({
      conversationId: savedConversation.id,
      agentId: otherAgentId,
    });
    await this.conversationMembershipRepository.save([
      membership1,
      membership2,
    ]);

    this.logger.verbose?.(
      `Created conversation ${savedConversation.id} with memberships for agents: ${currentUserAgentId}, ${otherAgentId}`,
      LogContext.COMMUNICATION_CONVERSATION
    );

    return savedConversation;
  }

  /**
   * Create a room for a conversation between two agents.
   * @param senderAgentId - Agent ID of the sender/initiator
   * @param receiverAgentId - Agent ID of the receiver
   * @param roomType - Type of room to create
   */
  private async createConversationRoom(
    senderAgentId: string,
    receiverAgentId: string,
    roomType: RoomType
  ): Promise<IRoom> {
    return await this.roomService.createRoom({
      displayName: `conversation-${senderAgentId}-${receiverAgentId}`,
      type: roomType,
      senderActorId: senderAgentId,
      receiverActorId: receiverAgentId,
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

  public async getCommentsCount(conversationID: string): Promise<number> {
    const room = await this.getRoom(conversationID);
    if (!room) return 0;
    return room.messagesCount;
  }

  /**
   * Ask a question to a virtual contributor in a conversation.
   * Caller is responsible for validation (type check, authorization).
   * @param conversation - Pre-fetched conversation with room relation
   * @param vc - Pre-fetched virtual contributor with agent relation
   * @param question - The question text
   * @param language - Language for the response
   * @param agentInfo - Caller's agent info
   */
  public async askQuestion(
    conversation: IConversation,
    vc: IVirtualContributor,
    question: string,
    language: string | undefined,
    agentInfo: AgentInfo
  ): Promise<ConversationVcAskQuestionResult> {
    // If the conversation has no room yet, create one on-demand
    if (!conversation.room) {
      conversation.room = await this.createConversationRoom(
        agentInfo.agentID,
        vc.agent.id,
        RoomType.CONVERSATION
      );
      await this.conversationRepository.save(conversation);
    }

    const message = await this.roomLookupService.sendMessage(
      conversation.room,
      agentInfo.agentID,
      {
        message: question,
        roomID: conversation.room.id,
      }
    );

    this.aiServerAdapter.invoke({
      bodyOfKnowledgeID: '',
      operation: InvocationOperation.QUERY,
      message: question,
      aiPersonaID: vc.aiPersonaID,
      userID: agentInfo.userID,
      displayName: 'Guidance',
      language: language,
      resultHandler: {
        action: InvocationResultAction.POST_MESSAGE,
        roomDetails: {
          roomID: conversation.room.id,
          actorId: vc.agent.id,
        },
      },
    });

    return {
      id: message.id,
      success: true,
      question: question,
    };
  }

  /**
   * Reset a conversation by deleting its room and creating a fresh one.
   * Caller is responsible for validation (type check, ownership check).
   * @param conversation - Pre-fetched conversation with room relation
   * @param senderAgentId - Agent ID of the sender (initiator)
   * @param receiverAgentId - Agent ID of the receiver
   */
  public async resetConversation(
    conversation: IConversation,
    senderAgentId: string,
    receiverAgentId: string
  ): Promise<IConversation> {
    if (conversation.room) {
      await this.roomService.deleteRoom({
        roomID: conversation.room.id,
      });
    }

    // Create a new room
    conversation.room = await this.createConversationRoom(
      senderAgentId,
      receiverAgentId,
      RoomType.CONVERSATION
    );
    return await this.save(conversation);
  }

  /**
   * Get all members of a conversation via the pivot table.   * Performance: Queries are limited to 2 members per conversation by domain constraint.
   * Consider DataLoader batching for GraphQL resolvers when querying multiple conversations.   * @param conversationId - UUID of the conversation
   * @returns Array of conversation memberships with agent relationships loaded
   */
  async getConversationMembers(
    conversationId: string
  ): Promise<IConversationMembership[]> {
    return await this.conversationMembershipRepository.find({
      where: { conversationId },
      relations: {
        agent: true,
      },
    });
  }

  /**
   * Check if an agent is a member of a conversation.
   * @param conversationId - UUID of the conversation
   * @param agentId - UUID of the agent
   * @returns true if the agent is a member, false otherwise
   */
  async isConversationMember(
    conversationId: string,
    agentId: string
  ): Promise<boolean> {
    const count = await this.conversationMembershipRepository.count({
      where: { conversationId, agentId },
    });
    return count > 0;
  }

  /**
   * Find an existing conversation between two agents.
   * Uses the pivot table to find conversations where both agents are members.
   * Performance: Self-join on pivot table with indexed foreign keys provides efficient lookups.
   * Query execution: < 10ms typical for indexed agent_id columns.
   * @param agentId1 - UUID of first agent
   * @param agentId2 - UUID of second agent
   * @returns The conversation if found, null otherwise
   */
  async findConversationBetweenAgents(
    agentId1: string,
    agentId2: string
  ): Promise<IConversation | null> {
    const result = await this.conversationMembershipRepository
      .createQueryBuilder('m1')
      .innerJoin(
        'conversation_membership',
        'm2',
        'm1.conversationId = m2.conversationId AND m1.agentId != m2.agentId'
      )
      .innerJoinAndSelect('m1.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      .where('m1.agentId = :agentId1', { agentId1 })
      .andWhere('m2.agentId = :agentId2', { agentId2 })
      .getOne();

    return result?.conversation || null;
  }

  /**
   * Find a conversation between a user and a well-known virtual contributor.
   * Uses the efficient findConversationBetweenAgents query.
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

    // Get user's agent ID
    const user = await this.userLookupService.getUserOrFail(userID, {
      relations: { agent: true },
    });
    const userAgentId = user.agent.id;

    // Get VC's agent ID
    const vc =
      await this.virtualContributorLookupService.getVirtualContributorOrFail(
        vcId,
        { relations: { agent: true } }
      );
    const vcAgentId = vc.agent.id;

    // Use efficient self-join query
    return this.findConversationBetweenAgents(userAgentId, vcAgentId);
  }

  /**
   * Infer conversation type from the agent types of its members.
   * Performance optimization: Uses short-circuit evaluation to check agent.type directly
   * without loading full user/virtualContributor entities. Agent type is eagerly loaded
   * by the memberships query, avoiding N+1 queries.
   * Enforces exactly at most 2 members per conversation (per spec clarification).
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

    // Check if any agent is a virtual contributor using agent.type field
    const hasVC = members.some(
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    return hasVC
      ? CommunicationConversationType.USER_VC
      : CommunicationConversationType.USER_USER;
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
      m => m.agent.type === AgentType.VIRTUAL_CONTRIBUTOR
    );

    if (!vcMember) {
      return null;
    }

    // Resolve VC from agent, eagerly loading agent relation
    return await this.virtualContributorLookupService.getVirtualContributorByAgentId(
      vcMember.agentId,
      { relations: { agent: true } }
    );
  }

  /**
   * T075: Get the user from a conversation via membership resolution.
   * Replaces direct access to conversation.userID (column dropped).
   * @param conversationId - UUID of the conversation
   * @param excludeAgentId - Optional agent ID to exclude (for finding "the other user")
   * @returns The user if found, null if conversation has no user member (or only excluded user)
   */
  async getUserFromConversation(
    conversationId: string,
    excludeAgentId?: string
  ): Promise<IUser | null> {
    const members = await this.getConversationMembers(conversationId);

    // Find a user member, excluding the specified agent if provided
    const userMember = members.find(
      m =>
        m.agent.type === AgentType.USER &&
        (!excludeAgentId || m.agentId !== excludeAgentId)
    );

    if (!userMember) {
      return null;
    }

    return await this.userLookupService.getUserByAgentId(userMember.agentId, {
      relations: { agent: true },
    });
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
      if (member.agent.type === AgentType.USER) {
        const user = await this.userLookupService.getUserByAgentId(
          member.agentId,
          { relations: { agent: true } }
        );
        if (user) users.push(user);
      } else if (member.agent.type === AgentType.VIRTUAL_CONTRIBUTOR) {
        const vc =
          await this.virtualContributorLookupService.getVirtualContributorByAgentId(
            member.agentId,
            { relations: { agent: true } }
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
   * Get all member agent IDs for a conversation.
   * Lightweight version of getConversationMembers that returns only IDs.
   * Used for subscription event filtering.
   * @param conversationId - UUID of the conversation
   * @returns Array of agent IDs
   */
  async getConversationMemberAgentIds(
    conversationId: string
  ): Promise<string[]> {
    const memberships = await this.conversationMembershipRepository.find({
      where: { conversationId },
      select: ['agentId'],
    });
    return memberships.map(m => m.agentId);
  }
}
