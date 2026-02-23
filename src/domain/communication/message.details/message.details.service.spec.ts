import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IMessage } from '../message/message.interface';
import { IRoom } from '../room/room.interface';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import { MessageDetailsService } from './message.details.service';

describe('MessageDetailsService', () => {
  let service: MessageDetailsService;
  let roomLookupService: Mocked<RoomLookupService>;
  let roomResolverService: Mocked<RoomResolverService>;
  let urlGeneratorService: Mocked<UrlGeneratorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageDetailsService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MessageDetailsService);
    roomLookupService = module.get(RoomLookupService);
    roomResolverService = module.get(RoomResolverService);
    urlGeneratorService = module.get(UrlGeneratorService);
  });

  describe('getMessageDetails', () => {
    const mockMessage: IMessage = {
      id: 'msg-1',
      message: 'Hello world',
      sender: 'agent-1',
      timestamp: Date.now(),
      reactions: [],
    };

    it('should return message details for a CALLOUT room type', async () => {
      const mockRoom = {
        id: 'room-1',
        type: RoomType.CALLOUT,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      const mockCallout = {
        id: 'callout-1',
        framing: { profile: { displayName: 'Test Callout' } },
      };
      roomResolverService.getCalloutForRoom.mockResolvedValue(
        mockCallout as any
      );
      urlGeneratorService.getCalloutUrlPath.mockResolvedValue(
        '/spaces/s1/callouts/callout-1'
      );

      const result = await service.getMessageDetails('room-1', 'msg-1');

      expect(result.roomID).toBe('room-1');
      expect(result.messageID).toBe('msg-1');
      expect(result.message).toBe('Hello world');
      expect(result.room).toBe(mockRoom);
      expect(result.parent.id).toBe('callout-1');
      expect(result.parent.displayName).toBe('Test Callout');
      expect(result.parent.url).toBe('/spaces/s1/callouts/callout-1');
    });

    it('should return message details for a POST room type', async () => {
      const mockRoom = {
        id: 'room-2',
        type: RoomType.POST,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      const mockPost = {
        post: {
          id: 'post-1',
          profile: { displayName: 'Test Post' },
        },
      };
      roomResolverService.getCalloutWithPostContributionForRoom.mockResolvedValue(
        mockPost as any
      );
      urlGeneratorService.getPostUrlPath.mockResolvedValue(
        '/spaces/s1/posts/post-1'
      );

      const result = await service.getMessageDetails('room-2', 'msg-1');

      expect(result.parent.id).toBe('post-1');
      expect(result.parent.displayName).toBe('Test Post');
      expect(result.parent.url).toBe('/spaces/s1/posts/post-1');
    });

    it('should return message details for a CALENDAR_EVENT room type', async () => {
      const mockRoom = {
        id: 'room-3',
        type: RoomType.CALENDAR_EVENT,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      const mockCalendarEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      };
      roomResolverService.getCalendarEventForRoom.mockResolvedValue(
        mockCalendarEvent as any
      );
      urlGeneratorService.getCalendarEventUrlPath.mockResolvedValue(
        '/spaces/s1/events/event-1'
      );

      const result = await service.getMessageDetails('room-3', 'msg-1');

      expect(result.parent.id).toBe('event-1');
      expect(result.parent.displayName).toBe('Test Event');
    });

    it('should return message details for a DISCUSSION_FORUM room type', async () => {
      const mockRoom = {
        id: 'room-4',
        type: RoomType.DISCUSSION_FORUM,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      const mockDiscussion = {
        id: 'discussion-1',
        profile: { displayName: 'Test Discussion' },
      };
      roomResolverService.getDiscussionForRoom.mockResolvedValue(
        mockDiscussion as any
      );
      urlGeneratorService.getForumDiscussionUrlPath.mockResolvedValue(
        '/forum/discussions/discussion-1'
      );

      const result = await service.getMessageDetails('room-4', 'msg-1');

      expect(result.parent.id).toBe('discussion-1');
      expect(result.parent.displayName).toBe('Test Discussion');
    });

    it('should throw NotSupportedException for UPDATES room type', async () => {
      const mockRoom = {
        id: 'room-5',
        type: RoomType.UPDATES,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      await expect(
        service.getMessageDetails('room-5', 'msg-1')
      ).rejects.toThrow(NotSupportedException);
    });

    it('should throw EntityNotFoundException for unknown room type', async () => {
      const mockRoom = {
        id: 'room-6',
        type: 'unknown_type' as RoomType,
      } as unknown as IRoom;

      roomLookupService.getMessageInRoom.mockResolvedValue({
        room: mockRoom,
        message: mockMessage,
      });

      await expect(
        service.getMessageDetails('room-6', 'msg-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
