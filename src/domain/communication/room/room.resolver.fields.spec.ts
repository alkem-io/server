import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { RoomDataLoader } from './room.data.loader';
import { IRoom } from './room.interface';
import { RoomResolverFields } from './room.resolver.fields';
import { RoomService } from './room.service';

describe('RoomResolverFields', () => {
  let resolver: RoomResolverFields;
  let roomService: Mocked<RoomService>;
  let authorizationService: Mocked<AuthorizationService>;
  let roomDataLoader: Mocked<RoomDataLoader>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    // RoomDataLoader is REQUEST-scoped, so provide it manually
    roomDataLoader = {
      loadLastMessage: vi.fn(),
      loadUnreadCount: vi.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomResolverFields,
        MockWinstonProvider,
        { provide: RoomDataLoader, useValue: roomDataLoader },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(RoomResolverFields);
    roomService = module.get(RoomService);
    authorizationService = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('messages', () => {
    it('should return messages for a room', async () => {
      const mockMessages = [{ id: 'msg-1' }, { id: 'msg-2' }] as IMessage[];
      const mockRoom = { id: 'room-1' } as any;
      roomService.getMessages.mockResolvedValue(mockMessages);

      const result = await resolver.messages(mockRoom);

      expect(result).toBe(mockMessages);
    });

    it('should return empty array when no messages', async () => {
      const mockRoom = { id: 'room-1' } as any;
      roomService.getMessages.mockResolvedValue(undefined as any);

      const result = await resolver.messages(mockRoom);

      expect(result).toEqual([]);
    });
  });

  describe('vcInteractions', () => {
    it('should return vc interactions from room', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
        vcInteractionsByThread: {
          'thread-1': { virtualContributorActorID: 'vc-1' },
        },
      } as unknown as IRoom;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);

      const result = await resolver.vcInteractions(mockRoom, actorContext);

      expect(result).toEqual([
        { threadID: 'thread-1', virtualContributorID: 'vc-1' },
      ]);
    });

    it('should return empty array when no vc interactions', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
        vcInteractionsByThread: undefined,
      } as unknown as IRoom;

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);

      const result = await resolver.vcInteractions(mockRoom, actorContext);

      expect(result).toEqual([]);
    });
  });

  describe('unreadCounts', () => {
    it('should return unread counts for room', async () => {
      const mockRoom = {
        id: 'room-1',
        authorization: { id: 'auth-1' },
      } as unknown as IRoom;
      const mockCounts = { total: 5, threads: [] };

      roomService.getRoomOrFail.mockResolvedValue(mockRoom as any);
      authorizationService.grantAccessOrFail.mockReturnValue(undefined as any);
      roomService.getUnreadCounts.mockResolvedValue(mockCounts as any);

      const result = await resolver.unreadCounts(mockRoom, actorContext, [
        'thread-1',
      ]);

      expect(result).toBe(mockCounts);
      expect(roomService.getUnreadCounts).toHaveBeenCalledWith(
        mockRoom,
        'user-1',
        ['thread-1']
      );
    });
  });

  describe('unreadCount', () => {
    it('should return unread count using data loader', async () => {
      const mockRoom = { id: 'room-1' } as any;
      roomDataLoader.loadUnreadCount.mockResolvedValue(3);

      const result = await resolver.unreadCount(mockRoom, actorContext);

      expect(result).toBe(3);
      expect(roomDataLoader.loadUnreadCount).toHaveBeenCalledWith(
        'room-1',
        'user-1'
      );
    });
  });

  describe('lastMessage', () => {
    it('should return last message using data loader', async () => {
      const mockRoom = { id: 'room-1' } as any;
      const mockMessage = { id: 'msg-1' } as IMessage;
      roomDataLoader.loadLastMessage.mockResolvedValue(mockMessage);

      const result = await resolver.lastMessage(mockRoom);

      expect(result).toBe(mockMessage);
    });

    it('should return null when no last message', async () => {
      const mockRoom = { id: 'room-1' } as any;
      roomDataLoader.loadLastMessage.mockResolvedValue(null);

      const result = await resolver.lastMessage(mockRoom);

      expect(result).toBeNull();
    });
  });
});
