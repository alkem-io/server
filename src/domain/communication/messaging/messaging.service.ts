import { ActorType, LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ConversationCreationType } from '@common/enums/conversation.creation.type';
import { RoomType } from '@common/enums/room.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Actor } from '@domain/actor/actor/actor.entity';
import { getMatrixDisplayName } from '@domain/actor/actor.matrix.display.name';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateConversationData } from '@domain/communication/conversation/dto';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, In, Repository } from 'typeorm';
import { IConversation } from '../conversation/conversation.interface';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationAuthorizationService } from '../conversation/conversation.service.authorization';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Messaging } from './messaging.entity';
import { IMessaging } from './messaging.interface';
import { CheckResult } from './types/check.result';
import { MessagingRejectionReason } from './types/messaging.rejection.reasons';

/**
 * Result of `MessagingService.getRoomInfo` — internal shape returned to the
 * matrix.room.check controller, which translates to the wire `GetRoomInfoResponse`.
 * Empty `type` + empty `members` is the canonical miss envelope.
 */
export interface GetRoomInfoResult {
  type: string;
  isDirect: boolean;
  members: Array<{ actorId: string; displayName: string }>;
}

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
    private readonly userLookupService: UserLookupService,
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

  /**
   * Synchronous Element room-check entrypoint (feature 099-element-room-check).
   *
   * Handles both DM (`isDirect=true`, exactly one member) and group
   * (`isDirect=false`, one or more members) — the divergence between the two
   * is three conditionals (dedup-probe, reject-reason ternary, room-type
   * ternary); everything else is shared.
   *
   * Steps, in order:
   *   1. Validate request shape (UUID-shaped ids; no duplicates; creator not
   *      in members; count matches type).
   *   2. Resolve creator + each member id against the Actor base table. A
   *      Matrix user maps to an Alkemio Actor of any subtype (User,
   *      VirtualContributor, Organization, Space, Account); the actor table
   *      is the single source of truth for the resolution check.
   *   3. For DMs only: dedup probe via `findConversationBetweenActors`.
   *   4. Evaluate per-member consent for USER-type actors only — other actor
   *      types have no `allowOtherUsersToSendMessages` setting and are
   *      treated as consent-exempt. If `consentingIds.length === 0`, reject
   *      — DM with the (sole) target denying → MESSAGING_DISABLED; group
   *      with every non-creator denying → NO_RECIPIENTS_ALLOW_MESSAGING.
   *   5. Persist Conversation + Room (with the assigned UUID) + Memberships
   *      via the same `conversationService.createConversation` used by the
   *      Alkemio-initiated flow. The `externalRoomId` parameter routes Room
   *      creation through `roomService.createRoomFromExternal` so we don't
   *      ask the adapter to create a Matrix room (Synapse already did).
   *   6. Apply authorization policy (same as `createConversation`).
   *   7. Publish `conversationCreated` via the existing helper — fan-out
   *      covers ONLY the consenting members (group partial-rejection falls
   *      out naturally).
   *   8. Return `{ kind: 'accepted', alkemioRoomId }`.
   *
   * Any uncaught failure → `{ kind: 'rejected', reason: INTERNAL_ERROR }`.
   * The wire never sees the underlying exception detail (FR-012).
   */
  public async createConversationFromExternal(input: {
    creatorActorId: string;
    memberActorIds: string[];
    isDirect: boolean;
  }): Promise<CheckResult> {
    const { creatorActorId, memberActorIds, isDirect } = input;

    try {
      // 1. Shape validation (FR-002, R-005)
      const shapeError = this.validateExternalCheckShape(
        creatorActorId,
        memberActorIds,
        isDirect
      );
      if (shapeError) {
        this.logger.warn?.(
          'createConversationFromExternal: malformed request',
          LogContext.COMMUNICATION_CONVERSATION
        );
        return {
          kind: 'rejected',
          reason: MessagingRejectionReason.MALFORMED_REQUEST,
        };
      }

      // 2. Resolve actors. A Matrix user maps to an Alkemio Actor of any
      // subtype (User, VirtualContributor, Organization, …) — the actor table
      // is the single source of truth. validateActorsAndGetTypes throws
      // EntityNotFoundException on any missing id; we collapse that ONLY to
      // the wire-level ACTOR_NOT_FOUND rejection. Any other failure (DB
      // outage, programmer error) is re-thrown so the outer try/catch maps it
      // to INTERNAL_ERROR and the underlying cause is logged at ERROR.
      let actorTypesById: Map<string, ActorType>;
      try {
        actorTypesById =
          await this.actorLookupService.validateActorsAndGetTypes([
            creatorActorId,
            ...memberActorIds,
          ]);
      } catch (error: unknown) {
        if (!(error instanceof EntityNotFoundException)) {
          throw error;
        }
        this.logger.warn?.(
          'createConversationFromExternal: one or more actors not found',
          LogContext.COMMUNICATION_CONVERSATION
        );
        return {
          kind: 'rejected',
          reason: MessagingRejectionReason.ACTOR_NOT_FOUND,
        };
      }

      // 3. DM-only dedup probe (FR-008)
      if (isDirect) {
        const existing =
          await this.conversationService.findConversationBetweenActors(
            creatorActorId,
            memberActorIds[0]
          );
        if (existing) {
          this.logger.verbose?.(
            'createConversationFromExternal: duplicate DM rejected',
            LogContext.COMMUNICATION_CONVERSATION
          );
          return {
            kind: 'rejected',
            reason: MessagingRejectionReason.DUPLICATE_DIRECT_CONVERSATION,
          };
        }
      }

      // 4. Consent gate — only Actors of type USER carry an inbound-messaging
      // preference (the `User.settings.communication.allowOtherUsersToSendMessages`
      // column). Non-USER actor types (VirtualContributor, Organization, Space,
      // Account) have no such setting and are treated as always consenting —
      // you are explicitly addressing them; there is no inbox to opt out of.
      // The DM-vs-group divergence is the same reject-reason ternary as before.
      const consentEvaluableActorIds = memberActorIds.filter(
        id => actorTypesById.get(id) === ActorType.USER
      );
      const consentExemptActorIds = memberActorIds.filter(
        id => actorTypesById.get(id) !== ActorType.USER
      );
      const consentingFromUserActors =
        consentEvaluableActorIds.length > 0
          ? (await this.evaluateMemberConsent(consentEvaluableActorIds))
              .consentingIds
          : [];
      const consentingIds = [
        ...consentingFromUserActors,
        ...consentExemptActorIds,
      ];
      if (consentingIds.length === 0) {
        const reason = isDirect
          ? MessagingRejectionReason.MESSAGING_DISABLED
          : MessagingRejectionReason.NO_RECIPIENTS_ALLOW_MESSAGING;
        this.logger.verbose?.(
          `createConversationFromExternal: no consenting members (${reason})`,
          LogContext.COMMUNICATION_CONVERSATION
        );
        return { kind: 'rejected', reason };
      }

      // 5. Persist via the shared conversationService.createConversation —
      // the only behavioural difference vs. the Alkemio-initiated flow is the
      // `externalRoomId` parameter that routes Room creation through
      // RoomService.createRoomFromExternal (skipping the adapter call).
      const assignedRoomId = randomUUID();
      const roomType = isDirect
        ? RoomType.CONVERSATION_DIRECT
        : RoomType.CONVERSATION_GROUP;

      const conversation = await this.conversationService.createConversation(
        creatorActorId,
        consentingIds,
        roomType,
        undefined,
        undefined,
        assignedRoomId
      );

      // 6. Set platform messaging parent + save (mirrors the Alkemio-initiated
      // path at line ~166-167).
      const messaging = await this.getPlatformMessaging();
      conversation.messaging = messaging as Messaging;
      await this.conversationService.save(conversation);

      // 7. Apply authorization policy (mirrors line ~169-173).
      const authorizations =
        await this.conversationAuthorizationService.applyAuthorizationPolicy(
          conversation.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);

      // 8. Reload + publish subscription (single shared publisher).
      const fullConversation =
        await this.conversationService.getConversationOrFail(conversation.id, {
          relations: { authorization: true, room: true },
        });
      const fanOut = [...new Set([creatorActorId, ...consentingIds])];
      await this.publishConversationCreatedEvents(fullConversation, fanOut);

      this.logger.verbose?.(
        `createConversationFromExternal: accepted (${roomType}) roomId=${assignedRoomId} members=${fanOut.length}`,
        LogContext.COMMUNICATION_CONVERSATION
      );

      return { kind: 'accepted', alkemioRoomId: assignedRoomId };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        'createConversationFromExternal: internal error',
        err?.stack,
        LogContext.COMMUNICATION_CONVERSATION
      );
      return {
        kind: 'rejected',
        reason: MessagingRejectionReason.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Shape-validate an inbound `room.check` payload. Returns true on any
   * violation. Constitution §5: messages are static; dynamic ids land in logs.
   */
  private validateExternalCheckShape(
    creatorActorId: string,
    memberActorIds: string[],
    isDirect: boolean
  ): boolean {
    if (!isUUID(creatorActorId)) return true;
    if (!Array.isArray(memberActorIds) || memberActorIds.length === 0)
      return true;
    if (memberActorIds.some(id => !isUUID(id))) return true;
    if (new Set(memberActorIds).size !== memberActorIds.length) return true;
    if (memberActorIds.includes(creatorActorId)) return true;
    if (isDirect && memberActorIds.length !== 1) return true;
    // group: length >= 1 already guaranteed by the second check above.
    return false;
  }

  /**
   * Partition a list of USER-type actor ids by their inbound-messaging consent
   * setting. Caller MUST pre-filter to actors whose type is ActorType.USER —
   * other actor types (VirtualContributor, Organization, …) have no equivalent
   * setting and are handled as consent-exempt upstream of this helper.
   *
   * The creator MUST NOT be passed to this helper — their setting is never
   * evaluated (opening a conversation is an explicit outbound opt-in for the
   * creator into that specific conversation; FR-004).
   *
   * Member actor ids not found in the User table are treated as denying
   * (defensive — actor resolution upstream already filters truly-unknown ids
   * to the ACTOR_NOT_FOUND rejection path).
   */
  private async evaluateMemberConsent(
    memberActorIds: string[]
  ): Promise<{ consentingIds: string[]; denyingIds: string[] }> {
    // settings is eager:false on the User entity — load it explicitly so the
    // consent column is populated; otherwise every actor falls through to
    // "denying" because settings is undefined.
    const userActors = await this.userLookupService.getUsersByIds(
      memberActorIds,
      { relations: { settings: true } }
    );
    const actorsById = new Map(userActors.map(a => [a.id, a]));
    const consentingIds: string[] = [];
    const denyingIds: string[] = [];
    for (const id of memberActorIds) {
      const actor = actorsById.get(id);
      const consent =
        actor?.settings?.communication?.allowOtherUsersToSendMessages === true;
      (consent ? consentingIds : denyingIds).push(id);
    }
    return { consentingIds, denyingIds };
  }

  /**
   * `room.info` RPC handler body (feature 099-element-room-check).
   *
   * Look up the Conversation by the supplied Room id; return type + members
   * with displayNames resolved via `getMatrixDisplayName`. A miss returns the
   * empty-members miss envelope (NOT an error) — the adapter retries
   * reconciliation on subsequent room events.
   */
  public async getRoomInfo(alkemioRoomId: string): Promise<GetRoomInfoResult> {
    if (!isUUID(alkemioRoomId)) {
      return { type: '', isDirect: false, members: [] };
    }

    const conversation =
      await this.conversationService.findConversationByRoomId(alkemioRoomId);
    if (!conversation || !conversation.room) {
      return { type: '', isDirect: false, members: [] };
    }

    const roomType = conversation.room.type as RoomType;
    const isDirect = roomType === RoomType.CONVERSATION_DIRECT;

    const memberships = await this.conversationService.getConversationMembers(
      conversation.id
    );
    const actorIds = memberships.map(m => m.actorID);
    // Resolve members against the Actor base table so VirtualContributors,
    // Organizations, etc. render correctly — not just Users. profile is
    // eager:false on Actor, so load it explicitly (getMatrixDisplayName reads
    // profile.displayName per FR-018).
    const actors = await this.entityManager.find(Actor, {
      where: { id: In(actorIds) },
      relations: { profile: true },
    });
    const actorsById = new Map(actors.map(a => [a.id, a]));

    const members = memberships.map(m => {
      const actor = actorsById.get(m.actorID);
      return {
        actorId: m.actorID,
        displayName: actor ? getMatrixDisplayName(actor) : m.actorID,
      };
    });

    return { type: roomType, isDirect, members };
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
