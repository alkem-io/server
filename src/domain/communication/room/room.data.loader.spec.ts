import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { RoomDataLoader } from './room.data.loader';
import { IRoom } from './room.interface';

describe('RoomDataLoader', () => {
  let loader: RoomDataLoader;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let authorizationService: Mocked<AuthorizationService>;

  const mockActorContext = (id = 'actor-1') =>
    ({
      actorID: id,
      credentials: [],
      isAnonymous: false,
    }) as unknown as ActorContext;

  const mockRoom = (id: string): IRoom =>
    ({
      id,
      authorization: { id: `auth-${id}` },
    }) as unknown as IRoom;

  beforeEach(() => {
    communicationAdapter = {
      batchGetLastMessages: vi.fn(),
      batchGetUnreadCounts: vi.fn(),
    } as any;

    authorizationService = {
      grantAccessOrFail: vi.fn(),
    } as any;

    loader = new RoomDataLoader(communicationAdapter, authorizationService);
  });

  it('should be defined', () => {
    expect(loader).toBeDefined();
  });

  describe('loadLastMessage', () => {
    it('should return the last message for a room', async () => {
      const mockMessage = { id: 'msg-1', message: 'Hello' } as IMessage;
      communicationAdapter.batchGetLastMessages.mockResolvedValue({
        'room-1': mockMessage,
      });

      const result = await loader.loadLastMessage(
        mockRoom('room-1'),
        mockActorContext()
      );

      expect(result).toBe(mockMessage);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
    });

    it('should return null when no last message exists', async () => {
      communicationAdapter.batchGetLastMessages.mockResolvedValue({});

      const result = await loader.loadLastMessage(
        mockRoom('room-1'),
        mockActorContext()
      );

      expect(result).toBeNull();
    });

    it('should batch multiple loadLastMessage calls', async () => {
      const mockMsg1 = { id: 'msg-1' } as IMessage;
      const mockMsg2 = { id: 'msg-2' } as IMessage;
      communicationAdapter.batchGetLastMessages.mockResolvedValue({
        'room-1': mockMsg1,
        'room-2': mockMsg2,
      });

      const ctx = mockActorContext();
      const [result1, result2] = await Promise.all([
        loader.loadLastMessage(mockRoom('room-1'), ctx),
        loader.loadLastMessage(mockRoom('room-2'), ctx),
      ]);

      expect(result1).toBe(mockMsg1);
      expect(result2).toBe(mockMsg2);
      expect(communicationAdapter.batchGetLastMessages).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('loadUnreadCount', () => {
    it('should return unread count for a room', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 5,
      });

      const result = await loader.loadUnreadCount(
        mockRoom('room-1'),
        mockActorContext()
      );

      expect(result).toBe(5);
    });

    it('should return 0 when no unread count exists', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({});

      const result = await loader.loadUnreadCount(
        mockRoom('room-1'),
        mockActorContext()
      );

      expect(result).toBe(0);
    });

    it('should batch calls for the same actor', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 3,
        'room-2': 7,
      });

      const ctx = mockActorContext();
      const [result1, result2] = await Promise.all([
        loader.loadUnreadCount(mockRoom('room-1'), ctx),
        loader.loadUnreadCount(mockRoom('room-2'), ctx),
      ]);

      expect(result1).toBe(3);
      expect(result2).toBe(7);
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledTimes(
        1
      );
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledWith(
        'actor-1',
        ['room-1', 'room-2']
      );
    });

    it('should use separate RPC calls for different actors', async () => {
      communicationAdapter.batchGetUnreadCounts
        .mockResolvedValueOnce({ 'room-1': 3 })
        .mockResolvedValueOnce({ 'room-1': 5 });

      const [result1, result2] = await Promise.all([
        loader.loadUnreadCount(mockRoom('room-1'), mockActorContext('actor-1')),
        loader.loadUnreadCount(mockRoom('room-1'), mockActorContext('actor-2')),
      ]);

      expect(result1).toBe(3);
      expect(result2).toBe(5);
      // Both batched in same DataLoader, but grouped by actor in batch fn
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledTimes(
        2
      );
    });

    it('should cache same actor+room combination', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 5,
      });

      const ctx = mockActorContext();
      const result1 = await loader.loadUnreadCount(mockRoom('room-1'), ctx);
      const result2 = await loader.loadUnreadCount(mockRoom('room-1'), ctx);

      expect(result1).toBe(5);
      expect(result2).toBe(5);
      // Only 1 RPC call — second was served from cache
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledTimes(
        1
      );
    });

    it('should throw when authorization fails', () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw new Error('Forbidden');
      });

      expect(() =>
        loader.loadUnreadCount(mockRoom('room-1'), mockActorContext())
      ).toThrow('Forbidden');
    });
  });
});
