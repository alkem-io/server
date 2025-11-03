import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
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
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

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

  public async createConversationsSet(): Promise<IConversationsSet> {
    const conversation: IConversationsSet = ConversationsSet.create();

    conversation.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_CONVERSATION
    );

    return await this.conversationsSetRepository.save(
      conversation as ConversationsSet
    );
  }

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
    conversationsSetID: string,
    userReciprocate: boolean
  ): Promise<IConversation> {
    const conversationsSet = await this.getConversationsSetOrFail(
      conversationsSetID,
      {
        relations: {
          conversations: true,
        },
      }
    );

    const existingConversations = conversationsSet.conversations;
    if (!existingConversations) {
      throw new EntityNotInitializedException(
        `conversations: Unable to load conversations entities for conversation creation: ${conversationsSet.id}`,
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Check if there is already an existing conversation of this type with the same target
    let existingConversation: IConversation | undefined;
    const existingConversationsByType = existingConversations.filter(
      conversation => conversation.type === conversationData.type
    );
    switch (conversationData.type) {
      case CommunicationConversationType.USER_VC:
        existingConversation = existingConversationsByType.find(
          conversation => {
            if (conversationData.virtualContributorID) {
              return (
                conversation.virtualContributorID ===
                conversationData.virtualContributorID
              );
            }
            if (conversationData.wellKnownVirtualContributor) {
              return (
                conversation.wellKnownVirtualContributor ===
                conversationData.wellKnownVirtualContributor
              );
            }
            return false;
          }
        );
        if (existingConversation) {
          this.logger.verbose?.(
            `Found existing USER_VC conversation (${existingConversation.id}) for VC (${conversationData.virtualContributorID})`,
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        break;
      case CommunicationConversationType.USER_USER:
        existingConversation = existingConversationsByType.find(
          conversation => {
            return conversation.userID === conversationData.userID;
          }
        );
        if (existingConversation) {
          this.logger.verbose?.(
            `Found existing USER_USER conversation (${existingConversation.id}) for User (${conversationData.userID})`,
            LogContext.COMMUNICATION_CONVERSATION
          );
        }
        break;
      default:
        throw new ValidationException(
          `Unsupported conversation type for existence check: ${conversationData.type}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
    }
    if (existingConversation) {
      return existingConversation;
    }

    const conversation =
      await this.conversationService.createConversation(conversationData);
    conversation.conversationsSet = conversationsSet;
    await this.conversationService.save(conversation);

    // If no existing room was found, create a reciprocal conversation for the other user
    if (
      conversationData.type === CommunicationConversationType.USER_USER &&
      userReciprocate
    ) {
      await this.createReciprocalUserConversation(
        conversation,
        conversationData
      );
    }

    return await this.conversationService.getConversationOrFail(
      conversation.id,
      {
        relations: {
          authorization: true,
          room: true,
        },
      }
    );
  }

  /**
   * Creates a reciprocal conversation for the other user in a USER_USER conversation.
   * Both conversations will share the same external room ID so messages are shared.
   */
  private async createReciprocalUserConversation(
    originalConversation: IConversation,
    originalConversationData: CreateConversationInput
  ): Promise<IConversation> {
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
      throw new RelationshipNotFoundException(
        `Other user (${originalConversation.userID}) does not have a conversations set, skipping reciprocal conversation creation`,
        LogContext.COMMUNICATION
      );
    }

    // Create reciprocal conversation data - swap the userID and currentUserID
    const reciprocalConversationData: CreateConversationInput = {
      type: CommunicationConversationType.USER_USER,
      userID: originalConversationData.currentUserID, // The original creator becomes the "other" user
      currentUserID: originalConversation.userID!, // The original "other" user becomes the current user
    };

    return await this.createConversationOnConversationsSet(
      reciprocalConversationData,
      otherUser.conversationsSet.id,
      false // Prevent infinite recursion
    );
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
