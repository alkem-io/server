import { Nack } from '@golevelup/nestjs-rabbitmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { CommunicationAdapterEventService } from './communication.adapter.event.service';

describe('CommunicationAdapterEventService', () => {
  let service: CommunicationAdapterEventService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationAdapterEventService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: vi.fn(),
            warn: vi.fn(),
            verbose: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CommunicationAdapterEventService>(
      CommunicationAdapterEventService
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onMessageReceived', () => {
    it('should emit message.received event', async () => {
      const payload = {
        roomId: 'room-123',
        actorID: 'actor-456',
        message: {
          id: 'msg-789',
          content: 'Hello',
          sender_actor_id: 'actor-456',
          timestamp: Date.now(),
        },
      } as any;

      await service.onMessageReceived(payload);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'message.received',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const payload = {
        roomId: 'room-123',
        actorID: 'actor-456',
        message: {
          id: 'msg-789',
          content: 'Hello',
          sender_actor_id: 'actor-456',
          timestamp: Date.now(),
        },
      } as any;

      const result = await service.onMessageReceived(payload);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onReactionAdded', () => {
    it('should emit reaction.added event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        message_id: 'msg-123',
        reaction_id: 'reaction-123',
        emoji: '👍',
        sender_actor_id: 'actor-456',
        timestamp: Date.now(),
      };

      await service.onReactionAdded(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'reaction.added',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onReactionAdded({
        alkemio_room_id: 'room-123',
        message_id: 'msg-123',
        reaction_id: 'reaction-123',
        emoji: '👍',
        sender_actor_id: 'actor-456',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onReactionRemoved', () => {
    it('should emit reaction.removed event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        message_id: 'msg-123',
        reaction_id: 'reaction-123',
        timestamp: Date.now(),
      };

      await service.onReactionRemoved(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'reaction.removed',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onReactionRemoved({
        alkemio_room_id: 'room-123',
        message_id: 'msg-123',
        reaction_id: 'reaction-123',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onMessageEdited', () => {
    it('should emit message.edited event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        sender_actor_id: 'actor-456',
        original_message_id: 'msg-orig',
        new_message_id: 'msg-new',
        new_content: 'Updated content',
        thread_id: 'thread-1',
        timestamp: Date.now(),
      };

      await service.onMessageEdited(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'message.edited',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onMessageEdited({
        alkemio_room_id: 'room-123',
        sender_actor_id: 'actor-456',
        original_message_id: 'msg-orig',
        new_message_id: 'msg-new',
        new_content: 'Updated content',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onMessageRedacted', () => {
    it('should emit message.redacted event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        redactor_actor_id: 'actor-456',
        redacted_message_id: 'msg-redacted',
        redaction_message_id: 'msg-redaction',
        reason: 'spam',
        thread_id: 'thread-1',
        timestamp: Date.now(),
      };

      await service.onMessageRedacted(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'message.redacted',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onMessageRedacted({
        alkemio_room_id: 'room-123',
        redactor_actor_id: 'actor-456',
        redacted_message_id: 'msg-redacted',
        redaction_message_id: 'msg-redaction',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onRoomCreated', () => {
    it('should emit room.created event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        creator_actor_id: 'actor-456',
        room_type: 'community',
        name: 'Test Room',
        topic: 'Test Topic',
        timestamp: Date.now(),
      };

      await service.onRoomCreated(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'room.created',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onRoomCreated({
        alkemio_room_id: 'room-123',
        creator_actor_id: 'actor-456',
        room_type: 'community',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onRoomDmRequested', () => {
    it('should emit room.dm.requested event', async () => {
      const payload = {
        initiator_actor_id: 'actor-1',
        target_actor_id: 'actor-2',
        timestamp: Date.now(),
      };

      await service.onRoomDmRequested(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'room.dm.requested',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onRoomDmRequested({
        initiator_actor_id: 'actor-1',
        target_actor_id: 'actor-2',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onRoomMemberLeft', () => {
    it('should emit room.member.left event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        actor_id: 'actor-456',
        reason: 'left voluntarily',
        timestamp: Date.now(),
      };

      await service.onRoomMemberLeft(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'room.member.left',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onRoomMemberLeft({
        alkemio_room_id: 'room-123',
        actor_id: 'actor-456',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onRoomMemberUpdated', () => {
    it('should emit room.member.updated event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        member_actor_id: 'member-456',
        sender_actor_id: 'sender-789',
        membership: 'join',
        timestamp: Date.now(),
      };

      await service.onRoomMemberUpdated(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'room.member.updated',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onRoomMemberUpdated({
        alkemio_room_id: 'room-123',
        member_actor_id: 'member-456',
        sender_actor_id: 'sender-789',
        membership: 'join',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });

  describe('onRoomReceiptUpdated', () => {
    it('should emit room.receipt.updated event', async () => {
      const payload = {
        alkemio_room_id: 'room-123',
        actor_id: 'actor-456',
        event_id: 'event-789',
        thread_id: 'thread-1',
        timestamp: Date.now(),
      };

      await service.onRoomReceiptUpdated(payload as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'room.receipt.updated',
        expect.any(Object)
      );
    });

    it('should return Nack on error', async () => {
      vi.mocked(eventEmitter.emit).mockImplementation(() => {
        throw new Error('Emit failed');
      });

      const result = await service.onRoomReceiptUpdated({
        alkemio_room_id: 'room-123',
        actor_id: 'actor-456',
        event_id: 'event-789',
        timestamp: Date.now(),
      } as any);

      expect(result).toBeInstanceOf(Nack);
    });
  });
});
