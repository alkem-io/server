import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository, EntityManager } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Messaging } from './messaging.entity';
import { IMessaging } from './messaging.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { IConversation } from '../conversation/conversation.interface';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ActorType } from '@common/enums/actor.type';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ActorLookupService } from '@domain/actor/actor-lookup';

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
    private readonly actorLookupService: ActorLookupService,
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
   * Create a conversation between two actors.
   * Either receiverActorId OR wellKnownVirtualContributor must be provided.
   *
   * @param callerActorId - Actor ID of the caller (creator)
   * @param receiverActorId - Actor ID of the receiver (User or VC), optional if wellKnownVC provided
   * @param wellKnownVirtualContributor - Well-known VC enum, resolved to actorId if provided
   */
  public async createConversation(
    callerActorId: string,
    receiverActorId?: string,
    wellKnownVirtualContributor?: VirtualContributorWellKnown
  ): Promise<IConversation> {
    // Resolve receiver actor ID
    let resolvedReceiverActorId: string;
    if (wellKnownVirtualContributor) {
      const vcId =
        await this.platformWellKnownVirtualContributorsService.getVirtualContributorID(
          wellKnownVirtualContributor
        );
      if (!vcId) {
        throw new ValidationException(
          `Well-known virtual contributor not found: ${wellKnownVirtualContributor}`,
          LogContext.COMMUNICATION_CONVERSATION
        );
      }
      resolvedReceiverActorId = vcId;
    } else if (receiverActorId) {
      resolvedReceiverActorId = receiverActorId;
    } else {
      throw new ValidationException(
        'Either receiverActorId or wellKnownVirtualContributor must be provided',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Validate receiver actor exists
    const receiverExists = await this.actorLookupService.getActorTypeById(
      resolvedReceiverActorId
    );
    if (!receiverExists) {
      throw new ValidationException(
        'Receiver actor not found',
        LogContext.COMMUNICATION_CONVERSATION,
        { receiverActorId: resolvedReceiverActorId }
      );
    }

    const messaging = await this.getPlatformMessaging();

    // createConversation handles existence check via efficient findConversationBetweenActors query
    // Room is always created eagerly as CONVERSATION_DIRECT (Matrix 1:1 room)
    const conversation = await this.conversationService.createConversation(
      callerActorId,
      resolvedReceiverActorId
    );

    // Only set messaging and apply authorization if this is a newly created conversation
    // (createConversation returns existing conversation if found)
    if (!conversation.messaging) {
      conversation.messaging = messaging as Messaging;
      await this.conversationService.save(conversation);

      const authorizations =
        await this.conversationAuthorizationService.applyAuthorizationPolicy(
          conversation.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);
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
    // Query the platform and load the messaging relation
    const platform = await this.entityManager
      .getRepository('Platform')
      .createQueryBuilder('platform')
      .leftJoinAndSelect('platform.messaging', 'messaging')
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
   * Get all conversations for a specific actor within a messaging container.
   * Uses the pivot table to find conversations where the actor is a member.
   * Optionally filters by conversation type.
   * @param messagingId - UUID of the messaging container (typically platform set)
   * @param actorId - UUID of the actor
   * @param typeFilter - Optional filter for conversation type (USER_USER or USER_VC)
   * @returns Array of conversations the actor is a member of
   */
  public async getConversationsForActor(
    messagingId: string,
    actorId: string,
    typeFilter?: CommunicationConversationType
  ): Promise<IConversation[]> {
    const queryBuilder = this.conversationMembershipRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      .where('membership.actorId = :actorId', { actorId })
      .andWhere('conversation.messagingId = :messagingId', { messagingId });

    // Filter by type using subquery - O(1) instead of O(n)
    if (typeFilter) {
      // Subquery checks if conversation has a VC member
      const vcExistsSubquery = this.conversationMembershipRepository
        .createQueryBuilder('m2')
        .innerJoin('m2.actor', 'a')
        .where('m2.conversationId = membership.conversationId')
        .andWhere('a.type = :vcType')
        .select('1');

      if (typeFilter === CommunicationConversationType.USER_VC) {
        queryBuilder.andWhere(`EXISTS (${vcExistsSubquery.getQuery()})`);
      } else {
        // USER_USER: No VC members
        queryBuilder.andWhere(`NOT EXISTS (${vcExistsSubquery.getQuery()})`);
      }
      queryBuilder.setParameter('vcType', ActorType.VIRTUAL);
    }

    const memberships = await queryBuilder.getMany();
    return memberships.map(m => m.conversation);
  }

  /**
   * Get all conversations for a user from the platform messaging.
   * @param userID - UUID of the user (which is also the actorId)
   * @param typeFilter - Optional filter for conversation type (USER_USER or USER_VC)
   * @returns Array of conversations the user is a member of
   */
  public async getConversationsForUser(
    userID: string,
    typeFilter?: CommunicationConversationType
  ): Promise<IConversation[]> {
    const platformMessaging = await this.getPlatformMessaging();
    const conversations = await this.getConversationsForActor(
      platformMessaging.id,
      userID, // User IS Actor - userID is the actorId
      typeFilter
    );

    this.logger.verbose?.(
      `Platform messaging query: found ${conversations.length} conversations for actor ${userID}`,
      LogContext.COMMUNICATION
    );

    return conversations;
  }
}
