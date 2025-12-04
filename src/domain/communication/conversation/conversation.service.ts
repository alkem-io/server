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
import { CreateConversationInput } from './dto/conversation.dto.create';
import { Conversation } from './conversation.entity';
import { IConversation } from './conversation.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto';
import { ConversationVcAskQuestionInput } from './dto/conversation.vc.dto.ask.question.input';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';
import { ConversationVcAskQuestionResult } from './dto/conversation.vc.dto.ask.question.result';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';

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
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  public async createConversation(
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    await this.validateCreateConversationData(conversationData);

    const conversation: IConversation = Conversation.create();
    conversation.type = conversationData.type;
    conversation.userID = conversationData.userID;
    conversation.virtualContributorID = conversationData.virtualContributorID;
    conversation.wellKnownVirtualContributor =
      conversationData.wellKnownVirtualContributor;
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Create the room if it's a user-to-user conversation
    if (conversation.type === CommunicationConversationType.USER_USER) {
      const sender = await this.userLookupService.getUserOrFail(
        conversationData.currentUserID,
        { relations: { agent: true } }
      );
      const receiver = await this.userLookupService.getUserOrFail(
        conversation.userID,
        { relations: { agent: true } }
      );
      conversation.room = await this.roomService.createRoom({
        displayName: `conversation-${conversationData.currentUserID}-${conversation.userID}`,
        type: RoomType.CONVERSATION_DIRECT,
        senderActorId: sender.agent.id,
        receiverActorId: receiver.agent.id,
      });
    }

    return conversation;
  }

  private async createConversationRoomUserToVc(
    conversation: IConversation,
    currentUserID: string,
    roomType: RoomType
  ): Promise<IRoom> {
    // Create the room
    const sender = await this.userLookupService.getUserOrFail(currentUserID, {
      relations: { agent: true },
    });

    const room = await this.roomService.createRoom({
      displayName: `conversation-${currentUserID}-${conversation.virtualContributorID}`,
      type: roomType,
      senderActorId: sender.agent.id,
    });
    return room;
  }

  private async validateCreateConversationData(
    conversationData: CreateConversationInput
  ) {
    // Validate based on conversation type
    switch (conversationData.type) {
      case CommunicationConversationType.USER_USER: {
        // USER_USER conversations must have a userID specified
        if (!conversationData.userID) {
          throw new ValidationException(
            'A user-to-user conversation must have a userID specified',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        if (conversationData.virtualContributorID) {
          throw new ValidationException(
            'A user-to-user conversation cannot have a virtualContributorID',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        if (conversationData.wellKnownVirtualContributor) {
          throw new ValidationException(
            'A user-to-user conversation cannot have a wellKnownVirtualContributor',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }

        // Check that there is not already a conversation between the two users in the current user's conversations set
        const existingConversation = await this.findUserToUserConversation(
          conversationData.currentUserID,
          conversationData.userID
        );
        if (existingConversation) {
          throw new ValidationException(
            'A conversation between these users already exists',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        break;
      }
      case CommunicationConversationType.USER_VC: {
        // USER_VC conversations must have a userID specified
        if (!conversationData.userID) {
          throw new ValidationException(
            'A user-to-agent conversation must have a userID specified',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }

        // Must have either virtualContributorID or wellKnownVirtualContributor, but not both
        const hasVcId = !!conversationData.virtualContributorID;
        const hasWellKnown = !!conversationData.wellKnownVirtualContributor;

        if (!hasVcId && !hasWellKnown) {
          throw new ValidationException(
            'A user-to-agent conversation must have either a virtualContributorID or wellKnownVirtualContributor',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }

        if (hasVcId && hasWellKnown) {
          throw new ValidationException(
            'A user-to-agent conversation cannot have both virtualContributorID and wellKnownVirtualContributor',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }

        // If using a concrete VC ID, validate it exists
        if (conversationData.virtualContributorID) {
          await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
            conversationData.virtualContributorID
          );
        }

        // Check that there is not already a conversation between user and virtual contributor
        const whereConditions: any = {
          type: conversationData.type,
          userID: conversationData.userID,
        };

        if (conversationData.virtualContributorID) {
          whereConditions.virtualContributorID =
            conversationData.virtualContributorID;
        }

        if (conversationData.wellKnownVirtualContributor) {
          whereConditions.wellKnownVirtualContributor =
            conversationData.wellKnownVirtualContributor;
        }

        const existingConversation = await this.conversationRepository.findOne({
          where: whereConditions,
        });

        if (existingConversation) {
          throw new ValidationException(
            'A conversation between this user and agent already exists',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }

        break;
      }
      default:
        throw new ValidationException(
          `Unsupported conversation type: ${conversationData.type}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
    }

    // Validate the user ID exists
    await this.userLookupService.getUserOrFail(conversationData.userID);
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
        conversationsSet: true,
      },
    });

    if (
      !conversation.room ||
      !conversation.authorization ||
      !conversation.conversationsSet
    ) {
      throw new EntityNotInitializedException(
        `Unable to load conversation for deleting: ${conversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Find the user who owns this conversation
    const conversationOwner = await this.entityManager.findOne(User, {
      where: {
        conversationsSet: {
          id: conversation.conversationsSet.id,
        },
      },
      relations: {
        agent: true,
      },
    });

    if (!conversationOwner) {
      throw new EntityNotFoundException(
        `Unable to find owner of conversation: ${conversationID}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

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
   *
   * @param chatData
   * @param agentInfo
   * @returns {
   *  room: IRoom;
   *  roomCreated: boolean; Indicates that the room has just been created with this request
   * }
   */
  public async askQuestion(
    chatData: ConversationVcAskQuestionInput,
    agentInfo: AgentInfo
  ): Promise<ConversationVcAskQuestionResult> {
    const guidanceConversation = await this.getConversationOrFail(
      chatData.conversationID,
      {
        relations: { room: true },
      }
    );

    // If the conversation has a well-known VC but no room yet, initialize it now
    if (
      !guidanceConversation.room &&
      guidanceConversation.wellKnownVirtualContributor
    ) {
      guidanceConversation.room =
        await this.createWellKnownVirtualContributorRoom(
          guidanceConversation,
          guidanceConversation.wellKnownVirtualContributor,
          agentInfo.userID!
        );

      // Save the updated conversation
      await this.conversationRepository.save(guidanceConversation);
    }

    if (!guidanceConversation.room) {
      throw new ValidationException(
        `Conversation has no associated room: ${guidanceConversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    const message = await this.roomLookupService.sendMessage(
      guidanceConversation.room,
      agentInfo.agentID,
      {
        message: chatData.question,
        roomID: guidanceConversation.room.id,
      }
    );

    const guidanceVc =
      await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
        guidanceConversation.virtualContributorID!,
        { relations: { agent: true } }
      );

    this.aiServerAdapter.invoke({
      bodyOfKnowledgeID: '',
      operation: InvocationOperation.QUERY,
      message: chatData.question,
      aiPersonaID: guidanceVc.aiPersonaID,
      userID: agentInfo.userID,
      displayName: 'Guidance',
      language: chatData.language,
      resultHandler: {
        action: InvocationResultAction.POST_MESSAGE,
        roomDetails: {
          roomID: guidanceConversation.room.id,
          actorId: guidanceVc.agent.id,
        },
      },
    });

    return {
      id: message.id,
      success: true,
      question: chatData.question,
    };
  }

  private async createWellKnownVirtualContributorRoom(
    conversation: IConversation,
    wellknownVc: VirtualContributorWellKnown,
    currentUserID: string
  ): Promise<IRoom> {
    // Resolve the well-known VC to a UUID
    const vcId =
      await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
        wellknownVc
      );

    if (!vcId) {
      throw new ValidationException(
        `Well-known virtual contributor ${wellknownVc} is not configured`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Set the resolved VC ID
    conversation.virtualContributorID = vcId;

    // Create the room now
    return await this.createConversationRoomUserToVc(
      conversation,
      currentUserID,
      RoomType.CONVERSATION
    );
  }

  // Resolve the well-known VC to a concrete VC
  public async resetUserConversationWithAgent(
    agentInfo: AgentInfo,
    conversationID: string
  ): Promise<IConversation> {
    const conversation = await this.getConversationOrFail(conversationID, {
      relations: { room: true },
    });
    if (conversation.type !== CommunicationConversationType.USER_VC) {
      throw new ValidationException(
        'Can only reset USER_AGENT conversations',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }
    if (conversation.userID !== agentInfo.userID) {
      throw new ValidationException(
        'User can only reset their own conversations',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    if (conversation.room) {
      await this.roomService.deleteRoom({
        roomID: conversation.room.id,
      });
    }

    // create a new room
    conversation.room = await this.createConversationRoomUserToVc(
      conversation,
      agentInfo.userID!,
      RoomType.CONVERSATION
    );
    return await this.save(conversation);
  }

  /**
   * Finds an existing USER_USER conversation between two users.
   * Note: Checks for a conversation in the conversationsSetOwnerUserID's conversation set
   * where the userID field points to the otherUserID.
   */
  private async findUserToUserConversation(
    conversationsSetOwnerUserID: string,
    otherUserID: string
  ): Promise<IConversation | null> {
    // First get the owner user's conversations set
    const ownerUser = await this.userLookupService.getUserOrFail(
      conversationsSetOwnerUserID,
      {
        relations: {
          conversationsSet: {
            conversations: true,
          },
        },
      }
    );

    if (!ownerUser.conversationsSet) {
      throw new EntityNotInitializedException(
        `User(${conversationsSetOwnerUserID}) does not have a conversations set.`,
        LogContext.COMMUNICATION
      );
    }

    // Find the conversation with the other user
    const conversation = ownerUser.conversationsSet.conversations.find(
      conversation =>
        conversation.type === CommunicationConversationType.USER_USER &&
        conversation.userID === otherUserID
    );

    return conversation || null;
  }
}
