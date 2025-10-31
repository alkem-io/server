import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationsSet } from './conversations.set.entity';
import { IConversationsSet } from './conversations.set.interface';
import { ConversationService } from '../conversation/conversation.service';
import { IConversation } from '../conversation/conversation.interface';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { CreateConversationInput } from '../conversation/dto/conversation.dto.create';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoom } from '../room/room.interface';

@Injectable()
export class ConversationsSetService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(ConversationsSet)
    private conversationsSetRepository: Repository<ConversationsSet>,
    private conversationService: ConversationService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private userLookupService: UserLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getConversationsSetOrFail(
    conversationsSetID: string,
    options?: FindOneOptions<ConversationsSet>
  ): Promise<IConversationsSet | never> {
    const conversationsSet = await ConversationsSet.findOne({
      where: { id: conversationsSetID },
      ...options,
    });
    if (!conversationsSet)
      throw new EntityNotFoundException(
        `ConversationsSet with id(${conversationsSetID}) not found!`,
        LogContext.TEMPLATES
      );
    return conversationsSet;
  }

  async deleteConversationsSet(
    conversationsSetID: string
  ): Promise<IConversationsSet> {
    const conversationsSet = await this.getConversationsSetOrFail(
      conversationsSetID,
      {
        relations: {
          authorization: true,
          conversations: true,
        },
      }
    );

    if (!conversationsSet.conversations || !conversationsSet.authorization) {
      throw new EntityNotInitializedException(
        `ConversationsSet (${conversationsSetID}) not initialised, cannot delete`,
        LogContext.COLLABORATION
      );
    }

    await this.authorizationPolicyService.delete(
      conversationsSet.authorization
    );

    for (const conversation of conversationsSet.conversations) {
      await this.conversationService.deleteConversation(conversation.id);
    }

    return await this.conversationsSetRepository.remove(
      conversationsSet as ConversationsSet
    );
  }

  public async getConversations(
    conversationsSetID: string
  ): Promise<IConversation[]> {
    const conversationsSet = await this.getConversationsSetOrFail(
      conversationsSetID,
      {
        relations: { conversations: true },
      }
    );
    return conversationsSet.conversations;
  }

  public async getConversationsCount(
    conversationsSetID: string
  ): Promise<number> {
    const conversationsSet = await this.getConversationsSetOrFail(
      conversationsSetID,
      {
        relations: { conversations: true },
      }
    );
    return conversationsSet.conversations.length;
  }

  public async createConversationOnConversationsSet(
    conversationData: CreateConversationInput,
    conversationsSetID: string
  ): Promise<IConversation> {
    const conversationsSet = await this.getConversationsSetOrFail(
      conversationsSetID,
      {
        relations: {
          conversations: true,
        },
      }
    );

    // For USER_USER conversations, check if the other user already has a conversation with us
    let existingRoom: IRoom | undefined;
    if (conversationData.type === CommunicationConversationType.USER_USER) {
      existingRoom = await this.findExistingRoomForUserConversation(
        conversationData.currentUserID,
        conversationData.userID
      );
    }

    // Create the conversation, passing the existing room if found
    const conversation = await this.conversationService.createConversation(
      conversationData,
      existingRoom
    );
    // this has the effect of adding the conversation to the collaboration
    conversation.conversationsSet = conversationsSet;

    // If no existing room was found, create a reciprocal conversation for the other user
    if (
      conversationData.type === CommunicationConversationType.USER_USER &&
      !existingRoom
    ) {
      await this.createReciprocalUserConversation(
        conversation,
        conversationData
      );
    }

    return conversation;
  }

  /**
   * Finds the room from an existing conversation if the other user already has a conversation with the current user.
   * This allows reusing the same Matrix room when the second user initiates a conversation.
   */
  private async findExistingRoomForUserConversation(
    currentUserID: string,
    otherUserID: string
  ): Promise<IRoom | undefined> {
    try {
      // Check if the other user already has a conversation with the current user
      const existingConversation =
        await this.conversationService.findUserToUserConversation(
          otherUserID,
          currentUserID
        );

      if (existingConversation && existingConversation.room) {
        this.logger.verbose?.(
          `Found existing room for conversation between users ${currentUserID} and ${otherUserID}`,
          LogContext.COMMUNICATION
        );
        return existingConversation.room;
      }

      return undefined;
    } catch (error: any) {
      this.logger.error(
        `Error finding existing room: ${error.message}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
      return undefined;
    }
  }

  /**
   * Creates a reciprocal conversation for the other user in a USER_USER conversation.
   * Both conversations will share the same external room ID so messages are shared.
   */
  private async createReciprocalUserConversation(
    originalConversation: IConversation,
    originalConversationData: CreateConversationInput
  ): Promise<void> {
    try {
      // Get the other user's conversations set
      const otherUser = await this.userLookupService.getUserOrFail(
        originalConversation.userID!,
        {
          relations: {
            conversationsSet: true,
          },
        }
      );

      if (!otherUser.conversationsSet) {
        this.logger.warn?.(
          `Other user (${originalConversation.userID}) does not have a conversations set, skipping reciprocal conversation creation`,
          LogContext.COMMUNICATION
        );
        return;
      }

      // Check if a conversation already exists for the other user
      const existingReciprocalConversation =
        await this.conversationService.findUserToUserConversation(
          originalConversation.userID!,
          originalConversationData.currentUserID
        );

      if (existingReciprocalConversation) {
        this.logger.verbose?.(
          `Reciprocal conversation already exists between users ${originalConversation.userID} and ${originalConversationData.currentUserID}`,
          LogContext.COMMUNICATION
        );
        return;
      }

      // Create reciprocal conversation data - swap the userID and currentUserID
      const reciprocalConversationData: CreateConversationInput = {
        type: CommunicationConversationType.USER_USER,
        userID: originalConversationData.currentUserID, // The original creator becomes the "other" user
        currentUserID: originalConversation.userID!, // The original "other" user becomes the current user
      };

      // Create the reciprocal conversation, passing the room so both use the same Matrix room
      const reciprocalConversation =
        await this.conversationService.createConversation(
          reciprocalConversationData,
          originalConversation.room
        );

      // Link it to the other user's conversations set
      reciprocalConversation.conversationsSet = otherUser.conversationsSet;

      // Save the reciprocal conversation
      await this.conversationService.save(reciprocalConversation);

      this.logger.verbose?.(
        `Created reciprocal conversation for user ${originalConversation.userID} with user ${originalConversationData.currentUserID}`,
        LogContext.COMMUNICATION
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to create reciprocal conversation: ${error.message}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
      // Don't throw - original conversation creation should succeed even if reciprocal fails
    }
  }

  public async save(
    conversationsSet: IConversationsSet
  ): Promise<IConversationsSet> {
    return await this.conversationsSetRepository.save(conversationsSet);
  }

  public async getUserConversations(
    conversationsSetID: string
  ): Promise<IConversation[]> {
    const userConversations = await this.getConversations(conversationsSetID);
    return userConversations.filter(
      conversation =>
        conversation.type === CommunicationConversationType.USER_USER
    );
  }

  public async getVcConversations(
    conversationsSetID: string
  ): Promise<IConversation[]> {
    const userConversations = await this.getConversations(conversationsSetID);
    return userConversations.filter(
      conversation =>
        conversation.type === CommunicationConversationType.USER_VC
    );
  }

  public async getConversationWithWellKnownVC(
    conversationsSetID: string,
    wellKnownVC: VirtualContributorWellKnown
  ): Promise<IConversation | undefined> {
    // Get the VC ID from the mappings service
    const virtualContributorID =
      await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
        wellKnownVC
      );

    if (!virtualContributorID) {
      return undefined;
    }

    // Find the conversation between the user and this VC
    const userConversations = await this.getConversations(conversationsSetID);
    return userConversations.find(
      conversation =>
        conversation.virtualContributorID === virtualContributorID &&
        conversation.type === CommunicationConversationType.USER_VC
    );
  }

  public isGuidanceEngineEnabled(): boolean {
    return this.configService.get('platform.guidance_engine.enabled', {
      infer: true,
    });
  }
}
