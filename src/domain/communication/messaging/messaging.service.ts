import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ConversationCreationType } from '@common/enums/conversation.creation.type';
import { RoomType } from '@common/enums/room.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateConversationData } from '@domain/communication/conversation/dto';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
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
   * DIRECT: dedup check (returns existing if found), exactly 1 member required.
   * GROUP: always creates new, N members.
   * Works with actor IDs — callers resolve user/VC IDs to actor IDs.
   */
  public async createConversation(
    conversationData: CreateConversationData
  ): Promise<IConversation> {
    // Normalize: deduplicate and remove self from member list
    const normalizedMemberActorIds = [
      ...new Set(conversationData.memberActorIds),
    ].filter(id => id !== conversationData.callerActorId);

    const isDirect = conversationData.type === ConversationCreationType.DIRECT;
    const roomType = isDirect
      ? RoomType.CONVERSATION_DIRECT
      : RoomType.CONVERSATION_GROUP;

    // DIRECT-specific: validate member count + dedup
    if (isDirect) {
      if (normalizedMemberActorIds.length !== 1) {
        throw new ValidationException(
          'DIRECT conversations require exactly 1 memberID',
          LogContext.COMMUNICATION_CONVERSATION
        );
      }

      const existing =
        await this.conversationService.findConversationBetweenActors(
          conversationData.callerActorId,
          normalizedMemberActorIds[0]
        );
      if (existing) {
        return await this.conversationService.getConversationOrFail(
          existing.id,
          { relations: { authorization: true, room: true } }
        );
      }
    } else if (normalizedMemberActorIds.length < 1) {
      throw new ValidationException(
        'GROUP conversations require at least 1 memberID',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Create conversation, assign to platform messaging, apply auth, publish event
    const messaging = await this.getPlatformMessaging();

    const conversation = await this.conversationService.createConversation(
      conversationData.callerActorId,
      normalizedMemberActorIds,
      roomType,
      conversationData.displayName,
      conversationData.avatarUrl
    );

    conversation.messaging = messaging as Messaging;
    await this.conversationService.save(conversation);

    const authorizations =
      await this.conversationAuthorizationService.applyAuthorizationPolicy(
        conversation.id
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    const fullConversation =
      await this.conversationService.getConversationOrFail(conversation.id, {
        relations: { authorization: true, room: true },
      });

    const allMemberIds = [
      ...new Set([conversationData.callerActorId, ...normalizedMemberActorIds]),
    ];

    await this.publishConversationCreatedEvents(fullConversation, allMemberIds);

    return fullConversation;
  }

  public async save(messaging: IMessaging): Promise<IMessaging> {
    return await this.messagingRepository.save(messaging as Messaging);
  }

  /**
   * Publish a single conversation created event to all members.
   * The `members` field resolver handles actor resolution — no pre-resolution needed.
   */
  private async publishConversationCreatedEvents(
    conversation: IConversation,
    memberActorIds: string[]
  ): Promise<void> {
    await this.subscriptionPublishService.publishConversationEvent({
      eventID: `conversation-event-${randomUUID()}`,
      memberActorIds,
      conversationCreated: {
        conversation,
      },
    });

    this.logger.verbose?.(
      `Published conversationCreated event for conversation ${conversation.id} to ${memberActorIds.length} members`,
      LogContext.COMMUNICATION
    );
  }

  /**
   * Create a direct conversation with a well-known virtual contributor.
   * Resolves the well-known VC to its actor ID, then delegates to createConversation.
   */
  public async createConversationWithWellKnownVC(
    callerActorId: string,
    wellKnownVC: VirtualContributorWellKnown
  ): Promise<IConversation> {
    const vcActorId =
      await this.conversationService.resolveWellKnownVCActorId(wellKnownVC);

    return this.createConversation({
      type: ConversationCreationType.DIRECT,
      callerActorId,
      memberActorIds: [vcActorId],
    });
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
   * Get all conversations for a specific actor within a messaging container.
   * Uses the pivot table to find conversations where the actor is a member.
   * Returns a flat list — client handles categorization by room type and member types.
   * @param messagingId - UUID of the messaging container (typically platform set)
   * @param actorID - UUID of the actor
   * @returns Array of conversations the actor is a member of
   */
  public async getConversationsForActor(
    messagingId: string,
    actorID: string
  ): Promise<IConversation[]> {
    const memberships = await this.conversationMembershipRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.conversation', 'conversation')
      .leftJoinAndSelect('conversation.authorization', 'authorization')
      // Room is non-nullable — inner join guarantees every
      // returned conversation has a room (and its type discriminator)
      .innerJoinAndSelect('conversation.room', 'room')
      .leftJoinAndSelect('room.authorization', 'roomAuthorization')
      .where('membership.actorID = :actorID', { actorID })
      .andWhere('conversation.messagingId = :messagingId', { messagingId })
      .getMany();

    return memberships.map(m => m.conversation);
  }
}
