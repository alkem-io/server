import { LogContext } from '@common/enums/logging.context';
import { RoomType } from '@common/enums/room.type';
import { NotSupportedException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Injectable } from '@nestjs/common';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { MessageDetails } from './message.details.interface';
import { MessageParent } from './message.details.parent.interface';

@Injectable()
export class MessageDetailsService {
  constructor(
    private roomLookupService: RoomLookupService,
    private roomResolverService: RoomResolverService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  async getMessageDetails(
    roomID: string,
    messageID: string
  ): Promise<MessageDetails> {
    const { room, message } = await this.roomLookupService.getMessageInRoom(
      roomID,
      messageID
    );
    const roomParentEntityInfo = await this.buildParentEntityInfoForRoom(
      room.type,
      roomID
    );
    return {
      roomID: room.id,
      messageID: message.id,
      room: room,
      message: message.message,
      parent: roomParentEntityInfo,
    };
  }

  private async buildParentEntityInfoForRoom(
    roomType: RoomType,
    roomID: string
  ): Promise<MessageParent> {
    switch (roomType) {
      case RoomType.CALLOUT: {
        const callout =
          await this.roomResolverService.getCalloutForRoom(roomID);
        return {
          id: callout.id,
          url: await this.urlGeneratorService.getCalloutUrlPath(callout.id),
          displayName: callout.framing.profile.displayName,
        };
      }
      case RoomType.POST: {
        const { post } =
          await this.roomResolverService.getCalloutWithPostContributionForRoom(
            roomID
          );

        return {
          id: post.id,
          url: await this.urlGeneratorService.getPostUrlPath(post.id),
          displayName: post.profile.displayName,
        };
      }

      case RoomType.CALENDAR_EVENT: {
        const calendarEvent =
          await this.roomResolverService.getCalendarEventForRoom(roomID);
        return {
          id: calendarEvent.id,
          url: await this.urlGeneratorService.getCalendarEventUrlPath(
            calendarEvent.id
          ),
          displayName: calendarEvent.profile.displayName,
        };
      }

      case RoomType.DISCUSSION_FORUM: {
        const discussion =
          await this.roomResolverService.getDiscussionForRoom(roomID);
        return {
          id: discussion.id,
          url: await this.urlGeneratorService.getForumDiscussionUrlPath(
            discussion.id
          ),
          displayName: discussion.profile.displayName,
        };
      }
      case RoomType.UPDATES: {
        throw new NotSupportedException(
          `Message details not supported for room type: ${roomType}`,
          LogContext.NOTIFICATIONS
        );
      }
      default:
        throw new EntityNotFoundException(
          `Unknown room type: ${roomType}`,
          LogContext.NOTIFICATIONS
        );
    }
  }
}
