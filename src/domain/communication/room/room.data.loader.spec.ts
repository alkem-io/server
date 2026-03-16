import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { type Mocked, vi } from 'vitest';
import { IMessage } from '../message/message.interface';
import { RoomDataLoader } from './room.data.loader';

describe('RoomDataLoader', () => {
  let loader: RoomDataLoader;
  let communicationAdapter: Mocked<CommunicationAdapter>;

  beforeEach(() => {
    communicationAdapter = {
      batchGetLastMessages: vi.fn(),
      batchGetUnreadCounts: vi.fn(),
    } as any;

    loader = new RoomDataLoader(communicationAdapter);
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

      const result = await loader.loadLastMessage('room-1');

      expect(result).toBe(mockMessage);
    });

    it('should return null when no last message exists', async () => {
      communicationAdapter.batchGetLastMessages.mockResolvedValue({});

      const result = await loader.loadLastMessage('room-1');

      expect(result).toBeNull();
    });

    it('should batch multiple loadLastMessage calls', async () => {
      const mockMsg1 = { id: 'msg-1' } as IMessage;
      const mockMsg2 = { id: 'msg-2' } as IMessage;
      communicationAdapter.batchGetLastMessages.mockResolvedValue({
        'room-1': mockMsg1,
        'room-2': mockMsg2,
      });

      const [result1, result2] = await Promise.all([
        loader.loadLastMessage('room-1'),
        loader.loadLastMessage('room-2'),
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

      const result = await loader.loadUnreadCount('room-1', 'actor-1');

      expect(result).toBe(5);
    });

    it('should return 0 when no unread count exists', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({});

      const result = await loader.loadUnreadCount('room-1', 'actor-1');

      expect(result).toBe(0);
    });

    it('should batch calls for the same actor', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 3,
        'room-2': 7,
      });

      const [result1, result2] = await Promise.all([
        loader.loadUnreadCount('room-1', 'actor-1'),
        loader.loadUnreadCount('room-2', 'actor-1'),
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
        loader.loadUnreadCount('room-1', 'actor-1'),
        loader.loadUnreadCount('room-1', 'actor-2'),
      ]);

      expect(result1).toBe(3);
      expect(result2).toBe(5);
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledTimes(
        2
      );
    });

    it('should cache same actor+room combination', async () => {
      communicationAdapter.batchGetUnreadCounts.mockResolvedValue({
        'room-1': 5,
      });

      const result1 = await loader.loadUnreadCount('room-1', 'actor-1');
      const result2 = await loader.loadUnreadCount('room-1', 'actor-1');

      expect(result1).toBe(5);
      expect(result2).toBe(5);
      expect(communicationAdapter.batchGetUnreadCounts).toHaveBeenCalledTimes(
        1
      );
    });
  });
});
