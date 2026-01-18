import { LogContext } from '@common/enums';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateConversationData } from '@domain/communication/conversation/dto';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { IConversation } from '../conversation/conversation.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Messaging } from './messaging.entity';
import { IMessaging } from './messaging.interface';

@Injectable()
export class MessagingService {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly conversationAuthorizationService: ConversationAuthorizationService,
    private readonly entityManager: EntityManager,
    @InjectRepository(Messaging)
    private readonly messagingRepository: Repository<Messaging>,
    @InjectRepository(ConversationMembership)
    private readonly conversationMembershipRepository: Repository<ConversationMembership>,
    private readonly conversationService: ConversationService,
    private readonly platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService,
    private readonly userLookupService: UserLookupService,
    private readonly virtualContributorLookupService: VirtualContributorLookupService,
    private readonly agentService: AgentService,
    private readonly subscriptionPublishService: SubscriptionPublishService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createMessaging(): Promise<IMessaging> {
    const messaging: IMessaging = Messaging.create();

    messaging.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNICATION_MESSAGING
    );

    return await this.messagingRepository.save(messaging as Messaging);
  }

  async getMessagingOrFail(
    messagingID: string,
    options?: FindOneOptions<Messaging>
  ): Promise<IMessaging> {
    const messaging = await Messaging.findOne({
      where: { id: messagingID },
      ...options,
    });
    if (!messaging)
      throw new EntityNotFoundException(
        `Messaging with id(${messagingID}) not found!`,
        LogContext.TEMPLATES
      );
    return messaging;
  }

  async deleteMessaging(messagingID: string): Promise<IMessaging> {
    const messaging = await this.getMessagingOrFail(messagingID, {
      relations: {
        authorization: true,
        conversations: true,
      },
    });

    if (!messaging.conversations || !messaging.authorization) {
      throw new EntityNotInitializedException(
        `Messaging (${messagingID}) not initialised, cannot delete`,
        LogContext.COLLABORATION
      );
    }

    await this.authorizationPolicyService.delete(messaging.authorization);

    for (const conversation of messaging.conversations) {
      await this.conversationService.deleteConversation(conversation.id);
    }

    return await this.messagingRepository.remove(messaging as Messaging);
  }

  public async getConversations(messagingID: string): Promise<IConversation[]> {
    const messaging = await this.getMessagingOrFail(messagingID, {
      relations: { conversations: true },
    });
    return messaging.conversations;
  }

  public async getConversationsCount(messagingID: string): Promise<number> {
    const messaging = await this.getMessagingOrFail(messagingID, {
      relations: { conversations: true },
    });
    return messaging.conversations.length;
  }

  /**
   * Create a conversation on the platform messaging.
   * Works with agent IDs - callers are responsible for resolving user/VC IDs to agent IDs.
   *
   * @param conversationData - Internal DTO with callerAgentId and either invitedAgentId or wellKnownVirtualContributor
   */
  public async createConversation(
    conversationData: CreateConversationData
  ): Promise<IConversation> {
    // Always use platform messaging (singleton pattern)
    const messaging = await this.getPlatformMessaging();

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

    // Only set messaging and apply authorization if this is a newly created conversation
    // (createConversation returns existing conversation if found)
    if (!conversation.messaging) {
      conversation.messaging = messaging as Messaging;
      await this.conversationService.save(conversation);

      // Apply authorization policy directly - no need for redundant search
      const authorizations =
        await this.conversationAuthorizationService.applyAuthorizationPolicy(
          conversation.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);

      // Fetch full conversation for return value
      const fullConversation =
        await this.conversationService.getConversationOrFail(conversation.id, {
          relations: {
            authorization: true,
            room: true,
          },
        });

      // Publish conversation created events to each member
      await this.publishConversationCreatedEvents(
        fullConversation,
        conversationData.callerAgentId,
        invitedAgentId,
        isUserVc
      );

      return fullConversation;
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

  public async save(messaging: IMessaging): Promise<IMessaging> {
    return await this.messagingRepository.save(messaging as Messaging);
  }

  /**
   * Publish conversation created events to each member.
   * Each member receives a personalized event with the "other user" pre-resolved.
   *
   * - USER_USER: Two events, each with _resolvedUser set to the OTHER user
   * - USER_VC: One event to human user with _resolvedVirtualContributor set
   */
  private async publishConversationCreatedEvents(
    conversation: IConversation,
    callerAgentId: string,
    invitedAgentId: string,
    isUserVc: boolean
  ): Promise<void> {
    if (isUserVc) {
      // USER_VC: Notify human user with VC pre-resolved
      const vc =
        await this.virtualContributorLookupService.getVirtualContributorByAgentId(
          invitedAgentId
        );

      if (!vc) {
        this.logger.warn(
          `Could not resolve virtual contributor for agent ${invitedAgentId} when publishing conversationCreated event`,
          LogContext.COMMUNICATION
        );
      }

      const conversationForCaller: IConversation = {
        ...conversation,
        _resolvedUser: null, // No other user in USER_VC
        _resolvedVirtualContributor: vc ?? null,
      };

      await this.subscriptionPublishService.publishConversationEvent({
        eventID: `conversation-event-${randomUUID()}`,
        memberAgentIds: [callerAgentId],
        conversationCreated: {
          conversation: conversationForCaller,
        },
      });

      this.logger.verbose?.(
        `Published conversationCreated event (USER_VC) for conversation ${conversation.id} to user agent ${callerAgentId}`,
        LogContext.COMMUNICATION
      );
    } else {
      // USER_USER: Notify both users, each with the OTHER user pre-resolved
      const [callerUser, invitedUser] = await Promise.all([
        this.userLookupService.getUserByAgentId(callerAgentId),
        this.userLookupService.getUserByAgentId(invitedAgentId),
      ]);

      if (!callerUser) {
        this.logger.warn(
          `Could not resolve caller user for agent ${callerAgentId} when publishing conversationCreated event`,
          LogContext.COMMUNICATION
        );
      }
      if (!invitedUser) {
        this.logger.warn(
          `Could not resolve invited user for agent ${invitedAgentId} when publishing conversationCreated event`,
          LogContext.COMMUNICATION
        );
      }

      // Event for caller: _resolvedUser = invited user (the other person)
      const conversationForCaller: IConversation = {
        ...conversation,
        _resolvedUser: invitedUser ?? null,
        _resolvedVirtualContributor: null,
      };

      // Event for invited user: _resolvedUser = caller (the other person)
      const conversationForInvited: IConversation = {
        ...conversation,
        _resolvedUser: callerUser ?? null,
        _resolvedVirtualContributor: null,
      };

      // Publish both events in parallel
      await Promise.all([
        this.subscriptionPublishService.publishConversationEvent({
          eventID: `conversation-event-${randomUUID()}`,
          memberAgentIds: [callerAgentId],
          conversationCreated: {
            conversation: conversationForCaller,
          },
        }),
        this.subscriptionPublishService.publishConversationEvent({
          eventID: `conversation-event-${randomUUID()}`,
          memberAgentIds: [invitedAgentId],
          conversationCreated: {
            conversation: conversationForInvited,
          },
        }),
      ]);

      this.logger.verbose?.(
        `Published conversationCreated events (USER_USER) for conversation ${conversation.id} to both users`,
        LogContext.COMMUNICATION
      );
    }
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
   * Get or create the singleton platform messaging.
   * All conversations belong to this single platform-owned set.
   * Retrieves the set via explicit Platform entity relationship.
   * Creates one if it doesn't exist (for bootstrap scenarios).
   * @returns The platform messaging
   */
  public async getPlatformMessaging(): Promise<IMessaging> {
    // Query the platform and load the messaging relation with authorization
    const platform = await this.entityManager
      .getRepository('Platform')
      .createQueryBuilder('platform')
      .leftJoinAndSelect('platform.messaging', 'messaging')
      .leftJoinAndSelect('messaging.authorization', 'authorization')
      .getOne();

    if (!platform) {
      throw new EntityNotFoundException(
        'Platform not found',
        LogContext.COMMUNICATION
      );
    }

    const messaging = platform.messaging;
    if (!messaging) {
      throw new EntityNotFoundException(
        'No Platform Messaging found!',
        LogContext.COMMUNICATION
      );
    }

    return messaging;
  }

  /**
   * Get all conversations for a specific agent within a messaging container.
   * Uses the pivot table to find conversations where the agent is a member.
   * Optionally filters by conversation type.
   * @param messagingId - UUID of the messaging container (typically platform set)
   * @param agentId - UUID of the agent
   * @param typeFilter - Optional filter for conversation type (USER_USER or USER_VC)
   * @returns Array of conversations the agent is a member of
   */
  public async getConversationsForAgent(
    messagingId: string,
    agentId: string,
    typeFilter?: CommunicationConversationType
  ): Promise<IConversation[]> {
    const queryBuilder = this.conversationMembershipRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      .where('membership.agentId = :agentId', { agentId })
      .andWhere('conversation.messagingId = :messagingId', { messagingId });

    // Filter by type using subquery - O(1) instead of O(n)
    if (typeFilter) {
      // Subquery checks if conversation has a VC member
      const vcExistsSubquery = this.conversationMembershipRepository
        .createQueryBuilder('m2')
        .innerJoin('m2.agent', 'a')
        .where('m2.conversationId = membership.conversationId')
        .andWhere('a.type = :vcType')
        .select('1');

      if (typeFilter === CommunicationConversationType.USER_VC) {
        queryBuilder.andWhere(`EXISTS (${vcExistsSubquery.getQuery()})`);
      } else {
        // USER_USER: No VC members
        queryBuilder.andWhere(`NOT EXISTS (${vcExistsSubquery.getQuery()})`);
      }
      queryBuilder.setParameter('vcType', AgentType.VIRTUAL_CONTRIBUTOR);
    }

    const memberships = await queryBuilder.getMany();
    return memberships.map(m => m.conversation);
  }

  /**
   * Get all conversations for a user from the platform messaging.
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

    const platformMessaging = await this.getPlatformMessaging();
    const conversations = await this.getConversationsForAgent(
      platformMessaging.id,
      user.agent.id,
      typeFilter
    );

    this.logger.verbose?.(
      `Platform messaging query: found ${conversations.length} conversations for agent ${user.agent.id}`,
      LogContext.COMMUNICATION
    );

    return conversations;
  }
}
