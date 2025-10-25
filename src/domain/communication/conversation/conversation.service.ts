import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
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
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { InvocationResultAction } from '@services/ai-server/ai-persona/dto';
import { ConversationAgentAskQuestionInput } from './dto/conversation.agent.dto.ask.question.input';
import { InvocationOperation } from '@common/enums/ai.persona.invocation.operation';
import { ConversationAgentAskQuestionResult } from './dto/conversation.agent.dto.ask.question.result';

@Injectable()
export class ConversationService {
  constructor(
    private aiServerAdapter: AiServerAdapter,
    private communicationAdapter: CommunicationAdapter,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  public async createConversation(
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    await this.validateCreateConversationData(conversationData);

    const conversation: IConversation = Conversation.create();
    conversation.type = conversationData.type;
    conversation.userIDs = conversationData.userIDs;
    conversation.virtualContributorID = conversationData.virtualContributorID;
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    conversation.room = await this.createConversationRoom(conversation);

    return await this.conversationRepository.save(conversation as Conversation);
  }
  private async createConversationRoom(
    conversation: IConversation
  ): Promise<IRoom> {
    // Create the room
    const room = await this.roomService.createRoom(
      `conversation-${conversation.userIDs.join('-')}`,
      RoomType.CONVERSATION
    );

    // Ensure the users (and virtual contributor if applicable) are added to the room
    for (const userID of conversation.userIDs) {
      const user = await this.userLookupService.getUserOrFail(userID);
      await this.communicationAdapter.userAddToRooms(
        [room.externalRoomID],
        user.communicationID
      );
    }

    if (conversation.type === CommunicationConversationType.USER_AGENT) {
      const virtualContributor =
        await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
          conversation.virtualContributorID!
        );
      await this.communicationAdapter.userAddToRooms(
        [room.externalRoomID],
        virtualContributor.communicationID
      );
    }
    return room;
  }

  private async validateCreateConversationData(
    conversationData: CreateConversationInput
  ) {
    // Validate based on conversation type
    switch (conversationData.type) {
      case CommunicationConversationType.USER_USER: {
        if (conversationData.userIDs.length !== 2) {
          throw new ValidationException(
            'A user-to-user conversation must be created between exactly two users',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        if (conversationData.virtualContributorID) {
          throw new ValidationException(
            'A user-to-user conversation cannot have a virtualContributorID',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        // Check that there is not already a conversation between these users
        const userIDsJson = JSON.stringify(conversationData.userIDs.sort());
        const existingConversations = await this.conversationRepository
          .createQueryBuilder('conversation')
          .where('conversation.type = :type', { type: conversationData.type })
          .andWhere('conversation.userIDs = :userIDs', { userIDs: userIDsJson })
          .getMany();
        if (existingConversations.length > 0) {
          throw new ValidationException(
            'A conversation between these users already exists',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        break;
      }
      case CommunicationConversationType.USER_AGENT: {
        if (conversationData.userIDs.length !== 1) {
          throw new ValidationException(
            'A user-to-agent conversation must be created with exactly one user',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        if (!conversationData.virtualContributorID) {
          throw new ValidationException(
            'A user-to-agent conversation must have a virtualContributorID',
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        // Check the virtual contributor ID is valid
        await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
          conversationData.virtualContributorID
        );
        // Check that there is not already a conversation between user and virtual contributor
        const userIDsJson = JSON.stringify(conversationData.userIDs.sort());
        const existingConversations = await this.conversationRepository
          .createQueryBuilder('conversation')
          .where('conversation.type = :type', { type: conversationData.type })
          .andWhere('conversation.userIDs = :userIDs', { userIDs: userIDsJson })
          .andWhere(
            'conversation.virtualContributorID = :virtualContributorID',
            {
              virtualContributorID: conversationData.virtualContributorID,
            }
          )
          .getMany();
        if (existingConversations.length > 0) {
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

    // check the user IDs are valid
    conversationData.userIDs.forEach(async userID => {
      await this.userLookupService.getUserOrFail(userID);
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
      },
    });

    if (!conversation.room || !conversation.authorization) {
      throw new EntityNotInitializedException(
        `Unable to load conversation for deleting: ${conversation.id}`,
        LogContext.COLLABORATION
      );
    }

    await this.roomService.deleteRoom(conversation.room);

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
    chatData: ConversationAgentAskQuestionInput,
    agentInfo: AgentInfo
  ): Promise<ConversationAgentAskQuestionResult> {
    const guidanceConversation = await this.getConversationOrFail(
      chatData.conversationID,
      {
        relations: { room: true },
      }
    );
    if (!guidanceConversation.room) {
      throw new ValidationException(
        'Conversation has no associated room',
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
    if (conversation.type !== CommunicationConversationType.USER_AGENT) {
      throw new ValidationException(
        'Can only reset USER_AGENT conversations',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }
    if (conversation.userIDs[0] !== agentInfo.userID) {
      throw new ValidationException(
        'User can only reset their own conversations',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    if (conversation.room) {
      await this.roomService.deleteRoom(conversation.room);
    }

    // create a new room
    conversation.room = await this.createConversationRoom(conversation);
    return await this.save(conversation);
  }
}
