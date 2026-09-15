import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';
import {
  DigestKind,
  digestKindFromMessageKind,
  notificationEventForDigestKind,
} from './conversation.digest.track';
import { classifyConversationMessage } from './conversation.notification.classification';
import { ConversationNotificationDedupeService } from './conversation.notification.dedupe.service';

// FR-020: bounds the plural recipient-lookup input; conversations larger
// than this are fanned out internally in bounded batches (mirrors
// NOTIFICATION_RECIPIENTS_USER_IDS_MAX on the DTO).
const RECIPIENT_BATCH_SIZE = 100;

// Bot/assistant sender types (D-11) — explicit list, never a default branch.
const BOT_ACTOR_TYPES = new Set<ActorType>([
  ActorType.VIRTUAL_CONTRIBUTOR,
  ActorType.VIRTUAL_ASSISTANT,
]);

export interface NotifyConversationMessageParams {
  conversation: IConversation;
  room: IRoom;
  message: IMessage;
  /** Current, re-read-at-send-time member actor IDs (D-13 hoist). */
  memberActorIds: string[];
  senderActorID: string;
}

/**
 * 034-messaging-notifications — the conversation-notification ARRIVAL path
 * (US1/US2/US4). Deliberately separate from `MessageNotificationService`
 * (untouched — D-3: mentions/replies stay OFF inside chats).
 *
 * **Operator Ruling R4**: this path NO LONGER SENDS ANYTHING. Message
 * arrival arms a per-recipient debounce timer; a periodic sweep decides, at
 * fire time, what is still unread and dispatches at most one digest
 * (`ConversationDigestFlushService`). Two things follow, and both are the
 * point of R4:
 *
 *  - the shipped model *lost information* (dropped messages were never
 *    summarised) — the digest reports everything still unread;
 *  - the shipped model *ignored presence* (a user reading a conversation was
 *    still emailed) — checking unread-at-fire-time IS the presence signal.
 *
 * Pipeline per message (data-model §8.1) — guard order preserved:
 *   kill switch → classify (Ruling 2) → bot sender (D-11) → dedupe (D-12)
 *   → resolve recipients (own settings row per FR-002) → ARM one timer per
 *   (recipient, channel).
 *
 * No send, no template render, no unread check, no push. The entire output of
 * this class is Redis writes. In-app is never touched — permanently OFF,
 * enforced at the adapter boundary (FR-003/D-2).
 *
 * The whole method is wrapped in try/catch (FR-014): a notification-pipeline
 * failure must never affect message delivery, counts, subscriptions, or VC
 * invocation, and must be observable rather than silently swallowed.
 */
@Injectable()
export class ConversationNotificationService {
  private readonly enabled: boolean;

  constructor(
    private readonly actorLookupService: ActorLookupService,
    private readonly notificationRecipientsService: NotificationRecipientsService,
    private readonly dedupeService: ConversationNotificationDedupeService,
    private readonly digestSchedulerService: ConversationDigestSchedulerService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.enabled = this.configService.get('notifications.messaging.enabled', {
      infer: true,
    });
  }

  async notifyConversationMessage(
    params: NotifyConversationMessageParams
  ): Promise<void> {
    try {
      await this.notifyConversationMessageUnsafe(params);
    } catch (error: any) {
      // FR-014: never let a notification-pipeline failure escape into the
      // message-ingestion call site (counts/subscriptions/VC invocation
      // must be unaffected). Observable via a dedicated log context rather
      // than silently swallowed.
      this.logger.error?.(
        {
          message: 'Conversation-message notification pipeline failed',
          conversationId: params.conversation?.id,
          messageId: params.message?.id,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }
  }

  private async notifyConversationMessageUnsafe(
    params: NotifyConversationMessageParams
  ): Promise<void> {
    const { conversation, room, message, memberActorIds, senderActorID } =
      params;

    // FR-016 — kill switch. In-code default TRUE (D-6); no ops-side
    // declaration ships this release (Ruling 3a/3b).
    if (!this.enabled) {
      return;
    }

    const kind = classifyConversationMessage(
      room.type,
      memberActorIds,
      this.logger as any
    );
    if (!kind) {
      // <2 members, or a caller-guard error already logged by the classifier.
      return;
    }

    // D-11 — bot/assistant senders never produce notifications. Explicit
    // list, never a default branch.
    const senderActorType =
      await this.actorLookupService.getActorTypeById(senderActorID);
    if (senderActorType && BOT_ACTOR_TYPES.has(senderActorType)) {
      return;
    }

    // FR-013/D-12 — at-most-one ARM per message event. Still on the arrival
    // path: a redelivered message event must not re-anchor the debounce.
    const claimed = await this.dedupeService.claim(message.id);
    if (!claimed) {
      return;
    }

    // FR-005 — recipients are the conversation membership re-read at send
    // time, minus the sender. Non-user candidates drop out naturally: the
    // recipients query only matches rows in the `user` table (FR-006).
    const recipientActorIds = memberActorIds.filter(id => id !== senderActorID);
    if (recipientActorIds.length === 0) {
      return;
    }

    const digestKind = digestKindFromMessageKind(kind);
    const event = notificationEventForDigestKind(digestKind);

    // FR-023 (first half) — settings are evaluated when the timer is armed
    // AND again at fire time. This decides WHICH tracks exist for this
    // message; the flush re-checks before dispatching.
    const { emailCandidates, pushCandidates } = await this.resolveRecipients(
      event,
      senderActorID,
      recipientActorIds
    );

    await Promise.all([
      this.armAll('email', digestKind, emailCandidates, conversation.id),
      this.armAll('push', digestKind, pushCandidates, conversation.id),
    ]);
  }

  /**
   * FR-011/FR-011a — one timer per (recipient, channel, kind). Armed
   * concurrently: each arm is a single Redis round trip and they are
   * independent, and the set is bounded by RECIPIENT_BATCH_SIZE per lookup.
   */
  private async armAll(
    channel: 'email' | 'push',
    kind: DigestKind,
    recipients: IUser[],
    conversationId: string
  ): Promise<void> {
    if (recipients.length === 0) {
      return;
    }
    const now = Date.now();
    await Promise.all(
      recipients.map(recipient =>
        this.digestSchedulerService.arm(
          { channel, kind, userId: recipient.id },
          conversationId,
          now
        )
      )
    );
  }

  /**
   * FR-020 — batches the recipient lookup into bounded chunks so a
   * conversation larger than the input bound still gets processed rather
   * than failing.
   */
  private async resolveRecipients(
    event: NotificationEvent,
    senderActorID: string,
    recipientActorIds: string[]
  ): Promise<{ emailCandidates: IUser[]; pushCandidates: IUser[] }> {
    const batches = this.chunk(recipientActorIds, RECIPIENT_BATCH_SIZE);
    const emailById = new Map<string, IUser>();
    const pushById = new Map<string, IUser>();

    for (const batch of batches) {
      const result = await this.notificationRecipientsService.getRecipients({
        eventType: event,
        triggeredBy: senderActorID,
        userIDs: batch,
      });
      for (const user of result.emailRecipients) {
        emailById.set(user.id, user);
      }
      for (const user of result.pushRecipients) {
        pushById.set(user.id, user);
      }
    }

    return {
      emailCandidates: [...emailById.values()],
      pushCandidates: [...pushById.values()],
    };
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
}
