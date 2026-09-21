import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { ProxySurfaceUsageService } from '../proxy-surface/proxy.surface.usage.service';
import { RoomDataLoader } from './room.data.loader';
import { IRoom } from './room.interface';
import { RoomResolverFields } from './room.resolver.fields';
import { RoomService } from './room.service';

describe('RoomResolverFields', () => {
  let resolver: RoomResolverFields;
  let roomService: Mocked<RoomService>;
  let authorizationService: Mocked<AuthorizationService>;
  let roomDataLoader: Mocked<RoomDataLoader>;
  let proxySurfaceUsage: Mocked<ProxySurfaceUsageService>;

  const actorContext = { actorID: 'user-1' } as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    proxySurfaceUsage = module.get(ProxySurfaceUsageService);
  });

  describe('proxy usage counting', () => {
    const room = { id: 'room-1', type: 'conversation_group' } as any;
    const context = { req: { headers: {} } } as any;

    it('counts each proxy read once per resolved parent room, and readiness never', async () => {
      roomService.getMessages.mockResolvedValue([]);
      roomService.getRoomOrFail.mockResolvedValue({
        ...room,
        authorization: {},
      });
      roomService.getUnreadCounts.mockResolvedValue({
        roomUnreadCount: 0,
      } as any);
      roomDataLoader.loadUnreadCount.mockResolvedValue(0);
      roomDataLoader.loadLastMessage.mockResolvedValue(null);

      await resolver.messages(room, context);
      await resolver.lastMessage(room, context);
      await resolver.unreadCount(room, actorContext, context);
      await resolver.unreadCounts(room, actorContext, undefined, context);
      resolver.readiness(room);

      expect(
        proxySurfaceUsage.record.mock.calls.map(([input]) => input)
      ).toEqual([
        {
          surface: 'Room.messages',
          roomType: 'conversation_group',
          req: context.req,
        },
        {
          surface: 'Room.lastMessage',
          roomType: 'conversation_group',
          req: context.req,
        },
        {
          surface: 'Room.unreadCount',
          roomType: 'conversation_group',
          req: context.req,
        },
        {
          surface: 'Room.unreadCounts',
          roomType: 'conversation_group',
          req: context.req,
        },
      ]);
    });
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('readiness', () => {
    it('resolves from the entity record without any adapter or service call', () => {
      const room = {
        id: 'room-1',
        readiness: {
          state: 'FAILED',
          reason: 'ADAPTER_TIMEOUT',
          detail: 'The messaging backend did not answer in time.',
          updatedAt: '2026-09-04T10:00:00.000Z',
        },
      } as unknown as IRoom;

      const result = resolver.readiness(room);

      expect(result).toEqual({
        state: 'FAILED',
        reason: 'ADAPTER_TIMEOUT',
        detail: 'The messaging backend did not answer in time.',
        updatedDate: new Date('2026-09-04T10:00:00.000Z'),
      });
      expect(roomService.getRoomOrFail).not.toHaveBeenCalled();
      expect(roomService.getMessages).not.toHaveBeenCalled();
    });

    it('reads a missing record as legacy UNKNOWN', () => {
      const result = resolver.readiness({ id: 'room-1' } as unknown as IRoom);
      expect(result.state).toBe('UNKNOWN');
      expect(result.reason).toBe('LEGACY_UNVERIFIED');
    });
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
      expect(roomDataLoader.loadLastMessage).toHaveBeenCalledWith('room-1');
    });

    it('should return null when no last message', async () => {
      const mockRoom = { id: 'room-1' } as any;
      roomDataLoader.loadLastMessage.mockResolvedValue(null);

      const result = await resolver.lastMessage(mockRoom);

      expect(result).toBeNull();
    });
  });
});
