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

@Injectable()
export class ConversationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>
  ) {}

  // TODO: do we support uploading content in a conversation? If so will need to pass in a storage aggregator

  public async createConversation(
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    this.validateCreateConversationData(conversationData);

    const conversation: IConversation = Conversation.create();
    conversation.type = conversationData.type;
    conversation.userIDs = conversationData.userIDs;
    conversation.virtualContributorID = conversationData.virtualContributorID;
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Create the room
    conversation.room = await this.roomService.createRoom(
      `conversation-${conversationData.userIDs.join('-')}`,
      RoomType.CONVERSATION
    );

    return conversation;
  }

  private validateCreateConversationData(
    conversationData: CreateConversationInput
  ) {
    // Validate based on conversation type
    switch (conversationData.type) {
      case CommunicationConversationType.USER_USER:
        if (conversationData.userIDs.length !== 2) {
          throw new ValidationException(
            'A user-to-user conversation must be created between exactly two users',
            LogContext.COLLABORATION
          );
        }
        if (conversationData.virtualContributorID) {
          throw new ValidationException(
            'A user-to-user conversation cannot have a virtualContributorID',
            LogContext.COLLABORATION
          );
        }
        break;
      case CommunicationConversationType.USER_AGENT:
        if (conversationData.userIDs.length !== 1) {
          throw new ValidationException(
            'A user-to-agent conversation must be created with exactly one user',
            LogContext.COLLABORATION
          );
        }
        if (!conversationData.virtualContributorID) {
          throw new ValidationException(
            'A user-to-agent conversation must have a virtualContributorID',
            LogContext.COLLABORATION
          );
        }
        break;
      default:
        throw new ValidationException(
          `Unsupported conversation type: ${conversationData.type}`,
          LogContext.COLLABORATION
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
}
