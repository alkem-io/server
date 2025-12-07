import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ConversationsSet } from './conversations.set.entity';
import { IConversationsSet } from './conversations.set.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationMembership } from '../conversation/conversation-membership.entity';
import { IConversation } from '../conversation/conversation.interface';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { CreateConversationData } from '../conversation/dto/conversation.dto.create';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AgentType } from '@common/enums/agent.type';

@Injectable()
export class ConversationsSetService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(ConversationsSet)
    private conversationsSetRepository: Repository<ConversationsSet>,
    @InjectRepository(ConversationMembership)
    private conversationMembershipRepository: Repository<ConversationMembership>,
    private conversationService: ConversationService,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private agentService: AgentService,
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

  /**
   * Create a conversation on the platform conversations set.
   * Works with agent IDs - callers are responsible for resolving user/VC IDs to agent IDs.
   *
   * @param conversationData - Internal DTO with callerAgentId and either invitedAgentId or wellKnownVirtualContributor
   * @param conversationsSetID - Optional set ID (defaults to platform set)
   */
  public async createConversationOnConversationsSet(
    conversationData: CreateConversationData,
    conversationsSetID: string | null
  ): Promise<IConversation> {
    // Use platform set if no explicit set provided
    const targetSetID =
      conversationsSetID || (await this.getPlatformConversationsSet()).id;

    const conversationsSet = await this.getConversationsSetOrFail(targetSetID);

    // Resolve the invited party to an agent ID if wellKnown was provided
    let invitedAgentId: string;
    let isUserVc = false;

    if (conversationData.wellKnownVirtualContributor) {
      // Resolve wellKnown → VC ID → agent ID
      const vcId =
        await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
          conversationData.wellKnownVirtualContributor
        );
      if (!vcId) {
        throw new ValidationException(
          `Well-known virtual contributor not found: ${conversationData.wellKnownVirtualContributor}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
      }
      const vc =
        await this.virtualContributorLookupService.getVirtualContributorOrFail(
          vcId,
          { relations: { agent: true } }
        );
      invitedAgentId = vc.agent.id;
      isUserVc = true;
    } else if (conversationData.invitedAgentId) {
      invitedAgentId = conversationData.invitedAgentId;
      // Determine if invited agent is a VC by checking agent type
      const agent = await this.agentService.getAgentOrFail(
        conversationData.invitedAgentId
      );
      isUserVc = agent.type === AgentType.VIRTUAL_CONTRIBUTOR;
    } else {
      throw new ValidationException(
        'Either invitedAgentId or wellKnownVirtualContributor must be provided',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Create room only for USER_USER conversations
    const createRoom = !isUserVc;

    // createConversation handles existence check via efficient findConversationBetweenAgents query
    const conversation = await this.conversationService.createConversation(
      conversationData.callerAgentId,
      invitedAgentId,
      createRoom
    );

    // Only set conversationsSet if this is a newly created conversation
    // (createConversation returns existing conversation if found)
    if (!conversation.conversationsSet) {
      conversation.conversationsSet = conversationsSet;
      await this.conversationService.save(conversation);
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

  public async save(
    conversationsSet: IConversationsSet
  ): Promise<IConversationsSet> {
    return await this.conversationsSetRepository.save(conversationsSet);
  }

  // T086: Find conversation with well-known VC using efficient membership query
  public async getConversationWithWellKnownVC(
    userID: string,
    wellKnownVC: VirtualContributorWellKnown
  ): Promise<IConversation | null> {
    return this.conversationService.findConversationWithWellKnownVC(
      userID,
      wellKnownVC
    );
  }

  public isGuidanceEngineEnabled(): boolean {
    return this.configService.get('platform.guidance_engine.enabled', {
      infer: true,
    });
  }

  /**
   * Get or create the singleton platform conversation set.
   * All conversations belong to this single platform-owned set.
   * Defensive: creates the set if it doesn't exist.
   * @returns The platform conversations set
   */
  public async getPlatformConversationsSet(): Promise<IConversationsSet> {
    // Try to find existing platform set
    // We identify it as the first/only conversations set (singleton assumption)
    // In a future iteration, this could be stored with a well-known ID or flag
    const platformSet = await this.conversationsSetRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    if (!platformSet) {
      // Defensive: create platform set if missing
      this.logger.warn?.(
        'Platform conversation set not found, creating',
        LogContext.COMMUNICATION
      );
      return await this.createConversationsSet();
    }

    return platformSet;
  }

  /**
   * Get all conversations for a specific agent within a conversations set.
   * Uses the pivot table to find conversations where the agent is a member.
   * Optionally filters by conversation type.
   * @param conversationsSetId - UUID of the conversations set (typically platform set)
   * @param agentId - UUID of the agent
   * @param typeFilter - Optional filter for conversation type (USER_USER or USER_VC)
   * @returns Array of conversations the agent is a member of
   */
  public async getConversationsForAgent(
    conversationsSetId: string,
    agentId: string,
    typeFilter?: CommunicationConversationType
  ): Promise<IConversation[]> {
    const query = this.conversationMembershipRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.conversation', 'conversation')
      .where('membership.agentId = :agentId', { agentId })
      .andWhere('conversation.conversationsSetId = :conversationsSetId', {
        conversationsSetId,
      });

    const memberships = await query.getMany();
    const conversations = memberships.map(m => m.conversation);

    // Filter by type if requested (requires inference)
    if (typeFilter) {
      const filtered: IConversation[] = [];
      for (const conv of conversations) {
        const type = await this.conversationService.inferConversationType(
          conv.id
        );
        if (type === typeFilter) {
          filtered.push(conv);
        }
      }
      return filtered;
    }

    return conversations;
  }

  /**
   * Get all conversations for a user from the platform conversation set.
   * Helper method that looks up user's agent and queries platform set.
   * @param userID - UUID of the user
   * @param typeFilter - Optional filter for conversation type (USER_USER or USER_VC)
   * @returns Array of conversations the user is a member of
   */
  public async getConversationsForUser(
    userID: string,
    typeFilter?: CommunicationConversationType
  ): Promise<IConversation[]> {
    const user = await this.userLookupService.getUserOrFail(userID, {
      relations: { agent: true },
    });

    if (!user.agent) {
      throw new EntityNotInitializedException(
        `User (${userID}) does not have an agent, cannot query conversations`,
        LogContext.COMMUNICATION
      );
    }

    const platformSet = await this.getPlatformConversationsSet();
    const conversations = await this.getConversationsForAgent(
      platformSet.id,
      user.agent.id,
      typeFilter
    );

    this.logger.verbose?.(
      `Platform conversation set query: found ${conversations.length} conversations for agent ${user.agent.id}`,
      LogContext.COMMUNICATION
    );

    return conversations;
  }
}
