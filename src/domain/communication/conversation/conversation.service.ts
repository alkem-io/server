import { Injectable } from '@nestjs/common';
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
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto';
import { ConversationVcAskQuestionInput } from './dto/conversation.vc.dto.ask.question.input';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';
import { ConversationVcAskQuestionResult } from './dto/conversation.vc.dto.ask.question.result';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';

@Injectable()
export class ConversationService {
  constructor(
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  public async createConversation(
    conversationData: CreateConversationInput,
    existingRoom?: IRoom
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

    // Use existing room if provided, otherwise create a new one
    if (existingRoom) {
      conversation.room = existingRoom;
    } else if (!conversationData.wellKnownVirtualContributor) {
      // Only create the room immediately if we have a concrete virtualContributorID
      // For well-known VCs, room creation is deferred until the first message
      conversation.room = await this.createConversationRoom(
        conversation,
        conversationData.currentUserID
      );
    }

    return await this.conversationRepository.save(conversation as Conversation);
  }

  private async createConversationRoom(
    conversation: IConversation,
    currentUserID: string
  ): Promise<IRoom> {
    // Create the room
    const room = await this.roomService.createRoom(
      `conversation-${conversation.userID}`,
      RoomType.CONVERSATION
    );

    // Add the user to the room
    const user = await this.userLookupService.getUserOrFail(currentUserID);
    await this.communicationAdapter.userAddToRooms(
      [room.externalRoomID],
      user.communicationID
    );

    // Add the other participant based on conversation type
    switch (conversation.type) {
      case CommunicationConversationType.USER_VC: {
        const virtualContributor =
          await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
            conversation.virtualContributorID!
          );
        await this.communicationAdapter.userAddToRooms(
          [room.externalRoomID],
          virtualContributor.communicationID
        );
      }
      case CommunicationConversationType.USER_USER: {
        const otherUser = await this.userLookupService.getUserOrFail(
          conversation.userID!
        );
        await this.communicationAdapter.userAddToRooms(
          [room.externalRoomID],
          otherUser.communicationID
        );

        break;
      }
    }
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

    if (!conversation.room || !conversation.authorization) {
      throw new EntityNotInitializedException(
        `Unable to load conversation for deleting: ${conversation.id}`,
        LogContext.COLLABORATION
      );
    }

    if (!conversation.conversationsSet) {
      throw new EntityNotInitializedException(
        `Unable to load conversationsSet for deleting conversation: ${conversation.id}`,
        LogContext.COLLABORATION
      );
    }

    // Find the user who owns this conversation
    const conversationOwner = await this.entityManager.findOne(User, {
      where: {
        conversationsSet: {
          id: conversation.conversationsSet.id,
        },
      },
    });

    if (!conversationOwner) {
      throw new EntityNotFoundException(
        `Unable to find owner of conversation: ${conversationID}`,
        LogContext.COLLABORATION
      );
    }

    // Remove the conversation owner from the Matrix room
    await this.communicationAdapter.removeUserFromRooms(
      [conversation.room.externalRoomID],
      conversationOwner.communicationID
    );

    // For USER_USER conversations, check if a reciprocal conversation exists
    // If it does, don't delete the Matrix room (other user still needs it)
    let shouldDeleteRoom = true;
    if (
      conversation.type === CommunicationConversationType.USER_USER &&
      conversation.userID
    ) {
      const reciprocalExists =
        await this.hasReciprocalConversation(conversation);
      if (reciprocalExists) {
        shouldDeleteRoom = false;
      }
    }

    // Delete the room entity, but only delete from Matrix if no reciprocal conversation exists
    await this.roomService.deleteRoom(conversation.room, shouldDeleteRoom);

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
    let guidanceConversation = await this.getConversationOrFail(
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
      // Resolve the well-known VC to a UUID
      const vcId =
        await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
          guidanceConversation.wellKnownVirtualContributor
        );

      if (!vcId) {
        throw new ValidationException(
          `Well-known virtual contributor ${guidanceConversation.wellKnownVirtualContributor} is not configured`,
          LogContext.COMMUNICATION_CONVERSATION
        );
      }

      // Set the resolved VC ID
      guidanceConversation.virtualContributorID = vcId;

      // Create the room now
      guidanceConversation.room = await this.createConversationRoom(
        guidanceConversation,
        agentInfo.userID!
      );

      // Save the updated conversation
      guidanceConversation = await this.conversationRepository.save(
        guidanceConversation as Conversation
      );
    }

    if (!guidanceConversation.room) {
      throw new ValidationException(
        `Conversation has no associated room: ${guidanceConversation.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    const message = await this.communicationAdapter.sendMessageToRoom({
      roomID: guidanceConversation.room.externalRoomID,
      senderCommunicationsID: agentInfo.communicationID,
      message: chatData.question,
    });

    const guidanceVc =
      await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
        guidanceConversation.virtualContributorID!
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
          communicationID: guidanceVc.communicationID,
        },
      },
    });

    return {
      id: message.id,
      success: true,
      question: chatData.question,
    };
  }

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
      await this.roomService.deleteRoom(conversation.room);
    }

    // create a new room
    conversation.room = await this.createConversationRoom(
      conversation,
      agentInfo.userID!
    );
    return await this.save(conversation);
  }

  /**
   * Finds an existing USER_USER conversation between two users.
   * Note: Checks for a conversation in the conversationsSetOwnerUserID's conversation set
   * where the userID field points to the otherUserID.
   */
  public async findUserToUserConversation(
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
      conv =>
        conv.type === CommunicationConversationType.USER_USER &&
        conv.userID === otherUserID
    );

    return conversation || null;
  }

  /**
   * Checks if a reciprocal USER_USER conversation exists for the other user.
   * This is used when deleting a conversation to determine if the Matrix room should be deleted.
   *
   * @param conversation The conversation being deleted
   * @returns true if the other user has a corresponding conversation, false otherwise
   */
  private async hasReciprocalConversation(
    conversation: IConversation
  ): Promise<boolean> {
    if (conversation.type !== CommunicationConversationType.USER_USER) {
      return false;
    }

    if (!conversation.userID || !conversation.conversationsSet) {
      return false;
    }

    // Find the user who owns this conversationsSet by querying for the user
    // that has a conversationsSet with this ID
    const entityManager = this.conversationRepository.manager;
    const conversationOwner = await entityManager.findOne(User, {
      where: {
        conversationsSet: {
          id: conversation.conversationsSet.id,
        },
      },
    });

    if (!conversationOwner) {
      return false;
    }

    // Check if the other user (conversation.userID) has a conversation back to the owner
    const reciprocalConversation = await this.findUserToUserConversation(
      conversation.userID,
      conversationOwner.id
    );

    return reciprocalConversation !== null;
  }
}
