import { LogContext } from '@common/enums';
import { getGroupDisplayNameForNotificationCopy } from '@common/utils/notification.copy.util';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { NotificationExternalAdapter } from '@services/adapters/notification-external-adapter/notification.external.adapter';
import { NotificationPushAdapter } from '@services/adapters/notification-push-adapter/notification.push.adapter';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  buildDigestPushCopy,
  ConversationDigestEntry,
} from './conversation.digest.copy';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';
import {
  DigestTrack,
  notificationEventForDigestKind,
  parseDigestTrack,
} from './conversation.digest.track';

/**
 * 034-messaging-notifications — Operator Ruling R4, data-model §5.3.
 *
 * Flushes ONE claimed recipient-track: decides what is still worth telling
 * the recipient, and dispatches at most one aggregate digest.
 *
 * The load-bearing sequence, in order, and why each step is where it is:
 *
 *  1. Drain the pending state FIRST. State is cleared BEFORE dispatch so a
 *     crash cannot re-send. The cost is a possible lost dispatch, bounded by
 *     the re-arm in §5.4 — and even a final drop self-heals, because the
 *     messages stay unread and the next message on this track re-arms.
 *  2. Re-read settings (FR-023). A recipient who disabled the channel while
 *     the timer was pending receives nothing.
 *  3. Drop conversations the recipient has left or that are gone (US2-AS4).
 *  4. ONE `batchGetUnreadCounts` for the whole flush — not one call per
 *     conversation. This is the fire-time unread signal, and it IS the
 *     presence check (D-19).
 *  5. Drop everything already read. If that empties the digest, dispatch
 *     NOTHING AT ALL (US1-AS6) — the single most important behaviour here.
 *  6. Dispatch; on throw, re-arm with backoff up to `max_dispatch_attempts`.
 *
 * Fail-open discipline (D-10): an unread-lookup failure sends rather than
 * silently cancelling. Every other limiter in this feature fails the same way.
 */
@Injectable()
export class ConversationDigestFlushService {
  constructor(
    private readonly digestSchedulerService: ConversationDigestSchedulerService,
    private readonly notificationRecipientsService: NotificationRecipientsService,
    private readonly conversationService: ConversationService,
    private readonly actorLookupService: ActorLookupService,
    private readonly communicationAdapter: CommunicationAdapter,
    private readonly notificationExternalAdapter: NotificationExternalAdapter,
    private readonly notificationPushAdapter: NotificationPushAdapter,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Flushes one track claimed by the sweep. Never throws — the sweep must
   * survive any single track's failure.
   */
  async flush(trackKey: string): Promise<void> {
    const track = parseDigestTrack(trackKey);
    if (!track) {
      // A corrupt or foreign due-queue member. Dropped, never guessed at.
      this.logger.warn?.(
        { message: 'Unparseable digest track claimed - dropping', trackKey },
        LogContext.NOTIFICATIONS
      );
      return;
    }
    try {
      await this.flushUnsafe(track, trackKey);
    } catch (error: any) {
      this.logger.error?.(
        {
          message: 'Digest flush failed',
          trackKey,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }
  }

  private async flushUnsafe(
    track: DigestTrack,
    trackKey: string
  ): Promise<void> {
    // 1. Drain the pending state BEFORE anything else (crash safety).
    const { conversationIds, firstAtMs } =
      await this.digestSchedulerService.readAndClear(trackKey);
    if (conversationIds.length === 0) {
      await this.digestSchedulerService.clearAttempts(trackKey);
      return;
    }

    // From here on the pending set and the cap anchor are ALREADY GONE, so
    // every fallible step below is covered by the same re-arm compensation —
    // not just the dispatch. Steps 2-4 are a DB query, two more DB queries and
    // a DB + Matrix RPC respectively; a transient failure in any of them used
    // to propagate to `flush`'s catch, which only logs, and the digest was lost
    // for good. The "next message on this track re-arms it" story does not
    // rescue that: it only holds while the burst is still going.
    //
    // The deliberate "send nothing" outcomes below are NOT failures and must
    // not re-arm — they clear the attempt budget and return normally.
    try {
      // 2. FR-023 — re-evaluate settings at fire time. `getRecipients` also
      // drops a user who no longer exists or lost the required privilege, so
      // this doubles as the recipient-still-valid check.
      const recipient = await this.resolveRecipient(track);
      if (!recipient) {
        await this.digestSchedulerService.clearAttempts(trackKey);
        return;
      }

      // 3. Resolve the pending conversations (one query) and drop the ones the
      // recipient can no longer see (US2-AS4).
      const conversations = await this.resolveMemberConversations(
        conversationIds,
        track.userId
      );
      if (conversations.length === 0) {
        await this.digestSchedulerService.clearAttempts(trackKey);
        return;
      }

      // 4/5. The fire-time unread check — ONE RPC for the whole flush.
      const entries = await this.buildEntries(track, recipient, conversations);
      if (entries.length === 0) {
        // US1-AS6 — the recipient read everything while the timer ran. Send
        // nothing at all: an "empty digest" is not a thing this feature emits.
        await this.digestSchedulerService.clearAttempts(trackKey);
        this.logger.verbose?.(
          {
            message:
              'Digest suppressed - everything pending was already read at fire time',
            trackKey,
            conversationCount: conversations.length,
          },
          LogContext.NOTIFICATIONS
        );
        return;
      }

      // 6. Dispatch.
      await this.dispatch(track, recipient, entries);
      await this.digestSchedulerService.clearAttempts(trackKey);
    } catch (error: any) {
      const reArmed = await this.digestSchedulerService.reArm(
        track,
        trackKey,
        conversationIds,
        firstAtMs ?? Date.now()
      );
      if (!reArmed) {
        this.logger.error?.(
          {
            message:
              'Digest flush failed after draining and the retry budget is exhausted - dropping. The underlying messages remain unread, so the next message on this track will re-report them.',
            trackKey,
            error: error?.message,
          },
          error?.stack,
          LogContext.NOTIFICATIONS
        );
        return;
      }
      this.logger.warn?.(
        {
          message: 'Digest flush failed after draining - re-armed with backoff',
          trackKey,
          error: error?.message,
        },
        LogContext.NOTIFICATIONS
      );
    }
  }

  /**
   * FR-023 — the recipient must still have THIS channel enabled for THIS
   * kind at fire time. Uses the same plural-input recipient resolver as the
   * arrival path, with a single id.
   */
  private async resolveRecipient(track: DigestTrack): Promise<IUser | null> {
    const event = notificationEventForDigestKind(track.kind);
    const result = await this.notificationRecipientsService.getRecipients({
      eventType: event,
      userIDs: [track.userId],
    });
    const candidates =
      track.channel === 'email'
        ? result.emailRecipients
        : result.pushRecipients;
    return candidates.find(user => user.id === track.userId) ?? null;
  }

  /**
   * US2-AS4 — a conversation the recipient has left (or that has been
   * deleted) contributes nothing to the digest. Two queries total, regardless
   * of how many conversations are pending.
   */
  private async resolveMemberConversations(
    conversationIds: string[],
    recipientActorId: string
  ): Promise<IConversation[]> {
    const conversations =
      await this.conversationService.getConversationsByIds(conversationIds);
    if (conversations.length === 0) {
      return [];
    }
    const membersByConversation =
      await this.conversationService.getMemberActorIdsForConversations(
        conversations.map(conversation => conversation.id)
      );
    return conversations.filter(
      conversation =>
        conversation.room &&
        (membersByConversation.get(conversation.id) ?? []).includes(
          recipientActorId
        )
    );
  }

  /**
   * D-19/FR-018 — the fire-time unread check.
   *
   * ONE `batchGetUnreadCounts` call for the whole flush; the per-room
   * `getUnreadCounts` is the wrong primitive here. A room missing from the
   * response map, or an RPC error, is treated as UNREAD (fail open, D-10 /
   * US5-AS5): an unread-lookup failure must never silently cancel a
   * notification.
   */
  private async buildEntries(
    track: DigestTrack,
    recipient: IUser,
    conversations: IConversation[]
  ): Promise<ConversationDigestEntry[]> {
    const roomIds = conversations.map(conversation => conversation.room.id);

    let unreadByRoomId: Record<string, number> | null = null;
    try {
      unreadByRoomId = await this.communicationAdapter.batchGetUnreadCounts(
        recipient.id,
        roomIds
      );
    } catch (error: any) {
      this.logger.error?.(
        {
          message:
            'Batch unread lookup failed - failing open (treating everything as unread)',
          userId: recipient.id,
          roomCount: roomIds.length,
          error: error?.message,
        },
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }

    const displayNames = await this.resolveEntryDisplayNames(
      track,
      recipient.id,
      conversations
    );

    const entries: ConversationDigestEntry[] = [];
    for (const conversation of conversations) {
      // `?? 1` is the fail-open branch, for BOTH a failed RPC (null map) and
      // a room simply absent from the response.
      const unread = unreadByRoomId?.[conversation.room.id] ?? 1;
      if (unread <= 0) {
        continue;
      }
      entries.push({
        displayName:
          displayNames.get(conversation.id) ??
          getGroupDisplayNameForNotificationCopy(undefined),
        count: unread,
        url:
          track.channel === 'email'
            ? // Contract C-6 — platform-absolute; opened outside the app.
              this.urlGeneratorService.getConversationUrl(conversation.id)
            : // Contract C-4 — bare relative path; the service worker
              // resolves it against the current origin.
              this.urlGeneratorService.getConversationDeepLinkPath(
                conversation.id
              ),
      });
    }
    return entries;
  }

  /**
   * Direct: the COUNTERPART's display name (the digest tells the recipient
   * who wrote). Group: the CONVERSATION's display name — the group digest
   * names conversations, not people (FR-018a).
   *
   * Counterparts are resolved in one bulk query rather than one per
   * conversation. `getGroupDisplayNameForNotificationCopy` normalizes the
   * internal "unnamed group" placeholder and sanitizes free text
   * (sec-server-4/corr-server-5) — display names are user-controlled and land
   * in an email subject and an OS notification title.
   */
  private async resolveEntryDisplayNames(
    track: DigestTrack,
    recipientActorId: string,
    conversations: IConversation[]
  ): Promise<Map<string, string>> {
    const displayNames = new Map<string, string>();

    if (track.kind === 'group') {
      for (const conversation of conversations) {
        displayNames.set(
          conversation.id,
          getGroupDisplayNameForNotificationCopy(conversation.room.displayName)
        );
      }
      return displayNames;
    }

    const membersByConversation =
      await this.conversationService.getMemberActorIdsForConversations(
        conversations.map(conversation => conversation.id)
      );
    const counterpartByConversation = new Map<string, string>();
    for (const conversation of conversations) {
      const counterpart = (
        membersByConversation.get(conversation.id) ?? []
      ).find(actorId => actorId !== recipientActorId);
      if (counterpart) {
        counterpartByConversation.set(conversation.id, counterpart);
      }
    }

    const resolved = await this.actorLookupService.getActorDisplayNamesByIds([
      ...new Set(counterpartByConversation.values()),
    ]);
    for (const conversation of conversations) {
      const counterpart = counterpartByConversation.get(conversation.id);
      const displayName = counterpart ? resolved.get(counterpart) : undefined;
      // Same neutral fallback the rest of this feature uses rather than
      // leaking an id or an empty subject line.
      displayNames.set(conversation.id, displayName ?? 'Someone');
    }
    return displayNames;
  }

  /**
   * data-model §8.3. Email goes on the durable queue as ONE wire event with a
   * single recipient; push is handed straight to the push adapter, bypassing
   * `PushThrottleService` entirely (FR-012 — messaging touches no
   * `push:throttle:*` key at all).
   */
  private async dispatch(
    track: DigestTrack,
    recipient: IUser,
    entries: ConversationDigestEntry[]
  ): Promise<void> {
    const event = notificationEventForDigestKind(track.kind);

    if (track.channel === 'email') {
      const payload =
        track.kind === 'direct'
          ? await this.notificationExternalAdapter.buildConversationMessageDirectPayload(
              event,
              recipient,
              entries
            )
          : await this.notificationExternalAdapter.buildConversationMessageGroupPayload(
              event,
              recipient,
              entries
            );
      // AWAITED deliberately: the plain `sendExternalNotifications` never
      // surfaces a broker failure, which made the reArm/max_dispatch_attempts
      // machinery below unreachable for email and silently dropped digests
      // whose Redis state `readAndClear` had already destroyed.
      await this.notificationExternalAdapter.sendExternalNotificationsAwaited(
        event,
        payload
      );
      return;
    }

    const copy = buildDigestPushCopy(
      track.kind,
      entries,
      this.urlGeneratorService.getChatSurfaceDeepLinkPath()
    );
    await this.notificationPushAdapter.sendMessagingPushNotifications(
      [recipient],
      event,
      copy
    );
  }
}
