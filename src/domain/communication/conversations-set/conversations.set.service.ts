import { Injectable } from '@nestjs/common';
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
import { CreateConversationOnConversationsSetInput } from './dto/conversations.set.dto.create.conversation';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';

@Injectable()
export class ConversationsSetService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(ConversationsSet)
    private conversationsSetRepository: Repository<ConversationsSet>,
    private conversationService: ConversationService
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

  async getPlatformConversationsSetOrFail(
    options?: FindOneOptions<ConversationsSet>
  ): Promise<IConversationsSet | never> {
    const conversationsSet = await ConversationsSet.findOne({
      ...options,
    });
    if (!conversationsSet)
      throw new EntityNotFoundException(
        'ConversationsSet for Platform not found!',
        LogContext.COMMUNICATION_CONVERSATION
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
    conversationData: CreateConversationOnConversationsSetInput
  ): Promise<IConversation> {
    const collaborationID = conversationData.conversationsSetID;
    const conversationsSet = await this.getConversationsSetOrFail(
      collaborationID,
      {
        relations: {
          conversations: true,
        },
      }
    );

    const conversation =
      await this.conversationService.createConversation(conversationData);
    // this has the effect of adding the conversation to the collaboration
    conversation.conversationsSet = conversationsSet;

    return conversation;
  }

  public async save(
    conversationsSet: IConversationsSet
  ): Promise<IConversationsSet> {
    return await this.conversationsSetRepository.save(conversationsSet);
  }

  async getVirtualContributionConversationForUser(
    userID: string,
    virtualContributorID: string
  ): Promise<IConversation | undefined> {
    const userConversations = await this.getConversationsForUser(userID);
    const conversationWithVc = userConversations.find(conversation => {
      return (
        conversation.virtualContributorID === virtualContributorID &&
        conversation.userIDs.includes(userID)
      );
    });

    return conversationWithVc;
  }

  public async getConversationsForUser(
    userID: string
  ): Promise<IConversation[]> {
    // TODO: horribly inefficient, needs a proper query
    const conversationsSet = await this.getPlatformConversationsSetOrFail({
      relations: { conversations: true },
    });
    const allConversations = conversationsSet.conversations;
    const userConversations = allConversations.filter(conversation =>
      conversation.userIDs.includes(userID)
    );
    return userConversations;
  }

  public isGuidanceEngineEnabled(): boolean {
    return this.configService.get('platform.guidance_engine.enabled', {
      infer: true,
    });
  }
}
