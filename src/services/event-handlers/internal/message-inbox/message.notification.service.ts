import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RoomType } from '@common/enums/room.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IMessage } from '@domain/communication/message/message.interface';
import {
  Mention,
  MentionedEntityType,
} from '@domain/communication/messaging/mention.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';
import { RoomMentionsService } from '@domain/communication/room-mentions/room.mentions.service';
import { Injectable } from '@nestjs/common';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';

/**
 * Service responsible for processing notifications and activity events
 * triggered by messages in rooms.
 */
@Injectable()
export class MessageNotificationService {
  constructor(
    private readonly roomServiceEvents: RoomServiceEvents,
    private readonly roomMentionsService: RoomMentionsService,
    private readonly roomResolverService: RoomResolverService,
    private readonly contributorLookupService: ContributorLookupService,
    private readonly communicationAdapter: CommunicationAdapter
  ) {}

  /**
   * Process all notifications for a received message.
   * Includes mentions, replies, and room-type-specific notifications.
   */
  async processMessageNotifications(
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo,
    threadID?: string
  ): Promise<void> {
    // Parse mentions from message text
    const mentions = await this.roomMentionsService.getMentionsFromText(
      message.message
    );

    // Process mention notifications
    if (mentions.length > 0) {
      await this.roomMentionsService.processNotificationMentions(
        mentions,
        room,
        message,
        agentInfo
      );
    }

    // Process reply notification if this is a reply
    const isReply = threadID && threadID !== message.id;
    if (isReply && threadID) {
      await this.processReplyNotification(room, message, agentInfo, threadID);
    }

    // Extract user IDs from mentions to avoid double notifications
    const mentionedUserIDs = mentions
      .filter(m => m.contributorType === MentionedEntityType.USER)
      .map(m => m.contributorID);

    // Process room-type-specific notifications and activities
    await this.processRoomTypeNotificationsAndActivities(
      room,
      message,
      agentInfo,
      mentionedUserIDs
    );
  }

  /**
   * Process reply notification - notifies the author of the parent message.
   */
  private async processReplyNotification(
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo,
    parentMessageId: string
  ): Promise<void> {
    const parentMessageSenderActorId =
      await this.communicationAdapter.getMessageSenderActor({
        alkemioRoomId: room.id,
        messageId: parentMessageId,
      });

    const messageOwnerId =
      await this.contributorLookupService.getUserIdByAgentId(
        parentMessageSenderActorId
      );

    if (messageOwnerId) {
      await this.roomServiceEvents.processNotificationCommentReply(
        room,
        message,
        agentInfo,
        messageOwnerId
      );
    }
  }

  /**
   * Process room-type-specific notifications and activity events.
   */
  private async processRoomTypeNotificationsAndActivities(
    room: IRoom,
    message: IMessage,
    agentInfo: AgentInfo,
    mentionedUserIDs: string[]
  ): Promise<void> {
    switch (room.type) {
      case RoomType.POST: {
        const { post, callout, contribution } =
          await this.roomResolverService.getCalloutWithPostContributionForRoom(
            room.id
          );

        await this.roomServiceEvents.processNotificationPostContributionComment(
          callout,
          post,
          contribution,
          room,
          message,
          agentInfo,
          mentionedUserIDs
        );

        await this.roomServiceEvents.processActivityPostComment(
          post,
          room,
          message,
          agentInfo
        );
        break;
      }

      case RoomType.CALENDAR_EVENT: {
        const calendarEvent =
          await this.roomResolverService.getCalendarEventForRoom(room.id);

        await this.roomServiceEvents.processNotificationCalendarEventComment(
          calendarEvent,
          room,
          message,
          agentInfo
        );
        break;
      }

      case RoomType.DISCUSSION_FORUM: {
        const discussionForum =
          await this.roomResolverService.getDiscussionForRoom(room.id);

        await this.roomServiceEvents.processNotificationForumDiscussionComment(
          discussionForum,
          message,
          agentInfo
        );
        break;
      }

      case RoomType.UPDATES: {
        await this.roomServiceEvents.processNotificationUpdateSent(
          room,
          message,
          agentInfo
        );

        await this.roomServiceEvents.processActivityUpdateSent(
          room,
          message,
          agentInfo
        );
        break;
      }

      case RoomType.CALLOUT: {
        const callout = await this.roomResolverService.getCalloutForRoom(
          room.id
        );

        if (
          callout.settings.visibility === CalloutVisibility.PUBLISHED &&
          callout.calloutsSet?.type === CalloutsSetType.COLLABORATION
        ) {
          await this.roomServiceEvents.processActivityCalloutCommentCreated(
            callout,
            message,
            agentInfo
          );

          await this.roomServiceEvents.processNotificationCalloutComment(
            callout,
            room,
            message,
            agentInfo,
            mentionedUserIDs
          );
        }
        break;
      }

      default:
        // No notifications or activities for other room types
        break;
    }
  }

  /**
   * Get mentions from message text.
   * Exposed for VC invocation service to parse VC mentions.
   */
  async getMentionsFromText(messageText: string): Promise<Mention[]> {
    return this.roomMentionsService.getMentionsFromText(messageText);
  }

  /**
   * Process VC mentions for a new thread.
   * Exposed for VC invocation service.
   */
  async processVirtualContributorMentions(
    mentions: Mention[],
    messageText: string,
    threadID: string,
    agentInfo: AgentInfo,
    room: IRoom
  ): Promise<void> {
    await this.roomMentionsService.processVirtualContributorMentions(
      mentions,
      messageText,
      threadID,
      agentInfo,
      room
    );
  }
}
