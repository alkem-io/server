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

    const conversation: IConversation = Conversation.create(conversationData);
    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    // Create the room
    conversation.room = await this.roomService.createRoom(
      `conversation-${conversationData.userIDs.join('-')}`,
      RoomType.CALLOUT
    );

    return conversation;
  }

  private validateCreateConversationData(
    conversationData: CreateConversationInput
  ) {
    // TODO: make this smarter by having a conversation type to distinguish between different kinds of conversations i.e. user to user, user to agent
    if (conversationData.userIDs.length !== 2) {
      throw new ValidationException(
        'A conversation must be created between exactly two users',
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
