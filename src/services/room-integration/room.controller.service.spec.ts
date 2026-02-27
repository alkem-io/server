import { EntityNotFoundException } from '@common/exceptions';
import { RoomLookupService } from '@domain/communication/room-lookup/room.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { RoomControllerService } from './room.controller.service';

describe('RoomControllerService', () => {
  let service: RoomControllerService;
  let roomLookupService: Mocked<RoomLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomControllerService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomControllerService);
    roomLookupService = module.get(RoomLookupService);
  });

  describe('getRoomEntityOrFail', () => {
    it('should return callout when room has a callout', async () => {
      const callout = { id: 'callout-1', framing: { profile: {} } };
      const room = { id: 'room-1', callout, post: undefined };
      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);

      const result = await service.getRoomEntityOrFail('room-1');

      expect(result).toBe(callout);
    });

    it('should return post when room has a post but no callout', async () => {
      const post = { id: 'post-1', profile: {} };
      const room = { id: 'room-1', callout: undefined, post };
      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);

      const result = await service.getRoomEntityOrFail('room-1');

      expect(result).toBe(post);
    });

    it('should throw EntityNotFoundException when room has neither callout nor post', async () => {
      const room = { id: 'room-1', callout: undefined, post: undefined };
      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);

      await expect(service.getRoomEntityOrFail('room-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should prefer callout over post when both exist', async () => {
      const callout = { id: 'callout-1' };
      const post = { id: 'post-1' };
      const room = { id: 'room-1', callout, post };
      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);

      const result = await service.getRoomEntityOrFail('room-1');

      expect(result).toBe(callout);
    });
  });

  describe('postReply', () => {
    it('should skip reply when threadID is not present', async () => {
      const event = {
        original: {
          resultHandler: {
            roomDetails: {
              roomID: 'room-1',
              threadID: undefined,
              actorID: 'actor-1',
            },
          },
        },
        response: { result: 'Answer', sources: [] },
      };

      await service.postReply(event as any);

      expect(roomLookupService.getRoomOrFail).not.toHaveBeenCalled();
    });

    it('should send reply and update externalThreadId when VC data exists without one', async () => {
      const vcData = {
        virtualContributorActorID: 'vc-1',
        externalThreadId: undefined,
      };
      const room = {
        id: 'room-1',
        vcInteractionsByThread: { 'thread-1': vcData },
      };
      const event = {
        original: {
          resultHandler: {
            roomDetails: {
              roomID: 'room-1',
              threadID: 'thread-1',
              actorID: 'actor-1',
            },
          },
        },
        response: {
          result: 'Answer',
          sources: [],
          threadId: 'ext-thread-42',
        },
      };

      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);
      roomLookupService.sendMessageReply.mockResolvedValue(undefined as any);
      roomLookupService.save.mockResolvedValue(room as any);

      await service.postReply(event as any);

      expect(roomLookupService.sendMessageReply).toHaveBeenCalledWith(
        room,
        'actor-1',
        expect.objectContaining({
          roomID: 'room-1',
          threadID: 'thread-1',
        })
      );
      expect(vcData.externalThreadId).toBe('ext-thread-42');
      expect(roomLookupService.save).toHaveBeenCalledWith(room);
    });

    it('should not update externalThreadId when vcData already has one', async () => {
      const vcData = {
        virtualContributorActorID: 'vc-1',
        externalThreadId: 'existing-ext',
      };
      const room = {
        id: 'room-1',
        vcInteractionsByThread: { 'thread-1': vcData },
      };
      const event = {
        original: {
          resultHandler: {
            roomDetails: {
              roomID: 'room-1',
              threadID: 'thread-1',
              actorID: 'actor-1',
            },
          },
        },
        response: {
          result: 'Answer',
          sources: [],
          threadId: 'new-ext-thread',
        },
      };

      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);
      roomLookupService.sendMessageReply.mockResolvedValue(undefined as any);

      await service.postReply(event as any);

      expect(vcData.externalThreadId).toBe('existing-ext');
      expect(roomLookupService.save).not.toHaveBeenCalled();
    });
  });

  describe('convertResultToMessage (via postMessage)', () => {
    it('should append sources with label when sources exist', async () => {
      const room = { id: 'room-1' };
      const event = {
        original: {
          resultHandler: {
            roomDetails: { roomID: 'room-1', actorID: 'actor-1' },
          },
        },
        response: {
          result: 'Answer text',
          sources: [
            { title: 'Doc A', uri: 'https://example.com/a' },
            { title: '', uri: 'https://example.com/b' },
          ],
        },
      };

      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);
      roomLookupService.sendMessage.mockResolvedValue(undefined as any);

      await service.postMessage(event as any);

      const sentMessage = roomLookupService.sendMessage.mock.calls[0][2];
      expect(sentMessage.message).toContain('##### Sources:');
      expect(sentMessage.message).toContain('[Doc A](https://example.com/a)');
      expect(sentMessage.message).toContain(
        '[https://example.com/b](https://example.com/b)'
      );
    });

    it('should append no-sources disclaimer when sources array is empty and sourcesLabel is true', async () => {
      const room = { id: 'room-1' };
      const event = {
        original: {
          resultHandler: {
            roomDetails: { roomID: 'room-1', actorID: 'actor-1' },
          },
        },
        response: {
          result: 'Answer text',
          sources: [],
        },
      };

      roomLookupService.getRoomOrFail.mockResolvedValue(room as any);
      roomLookupService.sendMessage.mockResolvedValue(undefined as any);

      await service.postMessage(event as any);

      const sentMessage = roomLookupService.sendMessage.mock.calls[0][2];
      expect(sentMessage.message).toContain(
        'Sorry, no sources are available for this response'
      );
    });
  });
});
