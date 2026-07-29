import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { NotificationEvent } from '@common/enums/notification.event';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { NotificationPushAdapter } from '@services/adapters/notification-push-adapter/notification.push.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  ConversationMessageKind,
  classifyConversationMessage,
} from './conversation.notification.classification';
import { ConversationNotificationDedupeService } from './conversation.notification.dedupe.service';
import { ConversationNotificationSuppressionService } from './conversation.notification.suppression.service';

// FR-020: bounds the plural recipient-lookup input; conversations larger
// than this are fanned out internally in bounded batches rather than
// failing (mirrors NOTIFICATION_RECIPIENTS_USER_IDS_MAX on the DTO).
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
 * 034-messaging-notifications — the new conversation-notification branch
 * (US1/US2/US4). Deliberately separate from `MessageNotificationService`
 * (untouched — D-3: mentions/replies stay OFF inside chats; the guard at the
 * call site is branched, not removed).
 *
 * Pipeline per message (data-model.md §8):
 *   kill switch → classify (Ruling 2) → sender guard (D-11) → dedupe (D-12)
 *   → resolve recipients (own settings row per FR-002) → email suppression
 *   (FR-011, email only) → emit DIRECT/GROUP wire event (Ruling 1) → push
 *   via the disjoint messaging budget (FR-012). In-app is never touched —
 *   permanently OFF, enforced at the adapter boundary (FR-003/D-2).
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
    private readonly userLookupService: UserLookupService,
    private readonly notificationRecipientsService: NotificationRecipientsService,
    private readonly notificationExternalAdapter: NotificationExternalAdapter,
    private readonly notificationPushAdapter: NotificationPushAdapter,
    private readonly urlGeneratorService: UrlGeneratorService,
    private readonly dedupeService: ConversationNotificationDedupeService,
    private readonly suppressionService: ConversationNotificationSuppressionService,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.enabled = this.configService.get<boolean>(
      'notifications.messaging.enabled' as any
    );
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

    // FR-013/D-12 — at-most-one dispatch per message event.
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

    const event =
      kind === 'DIRECT'
        ? NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT
        : NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP;

    const { emailCandidates, pushCandidates } = await this.resolveRecipients(
      event,
      senderActorID,
      recipientActorIds
    );

    await Promise.all([
      this.dispatchEmail(
        kind,
        event,
        senderActorID,
        conversation,
        room,
        emailCandidates
      ),
      this.dispatchPush(
        kind,
        event,
        senderActorID,
        conversation,
        room,
        pushCandidates
      ),
    ]);
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

  private async dispatchEmail(
    kind: ConversationMessageKind,
    event: NotificationEvent,
    senderActorID: string,
    conversation: IConversation,
    room: IRoom,
    emailCandidates: IUser[]
  ): Promise<void> {
    if (emailCandidates.length === 0) {
      return;
    }

    // FR-011/D-8 — email-only leading-edge suppression window, per
    // (recipient, conversation). Fails open (send + log) on store errors.
    const emailRecipients: IUser[] = [];
    for (const user of emailCandidates) {
      const suppressed = await this.suppressionService.isSuppressed(
        user.id,
        conversation.id
      );
      if (!suppressed) {
        emailRecipients.push(user);
      }
    }

    if (emailRecipients.length === 0) {
      return;
    }

    const payload =
      kind === 'DIRECT'
        ? await this.notificationExternalAdapter.buildConversationMessageDirectPayload(
            event,
            senderActorID,
            emailRecipients,
            conversation.id
          )
        : await this.notificationExternalAdapter.buildConversationMessageGroupPayload(
            event,
            senderActorID,
            emailRecipients,
            conversation.id,
            room.displayName
          );

    await this.notificationExternalAdapter.sendExternalNotifications(
      event,
      payload
    );
  }

  private async dispatchPush(
    kind: ConversationMessageKind,
    event: NotificationEvent,
    senderActorID: string,
    conversation: IConversation,
    room: IRoom,
    pushCandidates: IUser[]
  ): Promise<void> {
    if (pushCandidates.length === 0) {
      return;
    }

    const senderDisplayName = await this.getSenderDisplayName(senderActorID);
    const conversationUrl = this.urlGeneratorService.getConversationUrl(
      conversation.id
    );

    // D-15 — copy built ONLY from trusted fields (sender display name,
    // conversation display name); no message-derived text anywhere.
    const payload =
      kind === 'DIRECT'
        ? {
            title: senderDisplayName,
            body: `${senderDisplayName} sent you a message`,
            url: conversationUrl,
          }
        : {
            title: room.displayName,
            body: `${senderDisplayName} sent a message in ${room.displayName}`,
            url: conversationUrl,
          };

    // FR-012 — messaging push budget is DISJOINT from the shared throttle
    // bucket in both directions; sendMessagingPushNotifications applies it.
    await this.notificationPushAdapter.sendMessagingPushNotifications(
      pushCandidates,
      event,
      payload
    );
  }

  private async getSenderDisplayName(senderActorID: string): Promise<string> {
    try {
      const sender = await this.userLookupService.getUserByIdOrFail(
        senderActorID,
        { relations: { profile: true } }
      );
      return sender?.profile?.displayName ?? 'Someone';
    } catch {
      return 'Someone';
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
}
