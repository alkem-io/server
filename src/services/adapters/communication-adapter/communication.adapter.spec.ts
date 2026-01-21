import { vi, type Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CommunicationAdapter } from './communication.adapter';
import { CommunicationAdapterException } from './communication.adapter.exception';
import {
  MatrixAdapterEventType,
  BaseResponse,
} from '@alkemio/matrix-adapter-lib';
import { RoomType as AlkemioRoomType } from '@common/enums/room.type';
import { CommunicationSendMessageInput } from './dto/communication.dto.message.send';
import type { Mocked } from 'vitest';

describe('CommunicationAdapter', () => {
  let adapter: CommunicationAdapter;
  let mockAmqpConnection: Mocked<AmqpConnection>;
  let mockLogger: {
    error: Mock;
    warn: Mock;
    verbose: Mock;
  };

  /**
   * Creates a success response with the flat BaseResponse structure.
   * Response types now extend BaseResponse directly (success/error at top level).
   */
  const createSuccessResponse = <T extends object>(
    data: T
  ): T & BaseResponse => ({
    ...data,
    success: true,
    error: undefined,
  });

  /**
   * Creates an error response with the flat BaseResponse structure.
   * Response types now extend BaseResponse directly (success/error at top level).
   */
  const createErrorResponse = (
    code: string,
    message: string
  ): BaseResponse => ({
    success: false,
    error: {
      code,
      message,
    },
  });

  beforeEach(async () => {
    mockAmqpConnection = {
      request: vi.fn(),
      publish: vi.fn(),
    } as unknown as Mocked<AmqpConnection>;

    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue({ enabled: true }),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    adapter = module.get<CommunicationAdapter>(CommunicationAdapter);
  });

  describe('syncActor (T037)', () => {
    it('should send correct payload for syncActor', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      const actorId = 'actor-uuid-123';
      const displayName = 'Test User';
      const avatarUrl = 'https://example.com/avatar.png';

      const result = await adapter.syncActor(actorId, displayName, avatarUrl);

      expect(mockAmqpConnection.request).toHaveBeenCalledWith({
        exchange: '',
        routingKey: MatrixAdapterEventType.COMMUNICATION_ACTOR_SYNC,
        payload: {
          actor_id: actorId,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
        timeout: expect.any(Number),
      });
      expect(result).toBe(true);
    });

    it('should return true when syncActor succeeds', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      const result = await adapter.syncActor('actor-id', 'Display Name');

      expect(result).toBe(true);
    });

    it('should return false when syncActor fails', async () => {
      const response = createErrorResponse(
        'INTERNAL_ERROR',
        'Something went wrong'
      );
      mockAmqpConnection.request.mockResolvedValue(response);

      const result = await adapter.syncActor('actor-id', 'Display Name');

      expect(result).toBe(false);
    });

    it('should handle optional avatarUrl parameter', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      await adapter.syncActor('actor-id', 'Display Name');

      expect(mockAmqpConnection.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            actor_id: 'actor-id',
            display_name: 'Display Name',
            avatar_url: undefined,
          }),
        })
      );
    });
  });

  describe('createRoom and createSpace (T038)', () => {
    it('should send correct payload for createRoom with all parameters', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      const alkemioRoomId = 'room-uuid-123';
      const roomType = AlkemioRoomType.DISCUSSION_FORUM;
      const name = 'Test Room';
      const initialMembers = ['member-1', 'member-2'];
      const parentContextId = 'parent-context-123';

      const result = await adapter.createRoom(
        alkemioRoomId,
        roomType,
        name,
        initialMembers,
        parentContextId
      );

      expect(mockAmqpConnection.request).toHaveBeenCalledWith({
        exchange: '',
        routingKey: MatrixAdapterEventType.COMMUNICATION_ROOM_CREATE,
        payload: expect.objectContaining({
          alkemio_room_id: alkemioRoomId,
          name,
          initial_members: initialMembers,
          parent_context_id: parentContextId,
        }),
        timeout: expect.any(Number),
      });
      expect(result).toBe(true);
    });

    it('should map CONVERSATION_DIRECT to RoomTypeDirect', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      await adapter.createRoom('room-id', AlkemioRoomType.CONVERSATION_DIRECT);

      expect(mockAmqpConnection.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            type: 'direct',
          }),
        })
      );
    });

    it('should map non-direct room types to RoomTypeCommunity', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      await adapter.createRoom('room-id', AlkemioRoomType.DISCUSSION_FORUM);

      expect(mockAmqpConnection.request).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            type: 'community',
          }),
        })
      );
    });

    it('should send correct payload for createSpace', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      const alkemioContextId = 'context-uuid-123';
      const name = 'Test Space';
      const parentContextId = 'parent-context-123';

      const result = await adapter.createSpace(
        alkemioContextId,
        name,
        parentContextId
      );

      expect(mockAmqpConnection.request).toHaveBeenCalledWith({
        exchange: '',
        routingKey: MatrixAdapterEventType.COMMUNICATION_SPACE_CREATE,
        payload: expect.objectContaining({
          alkemio_context_id: alkemioContextId,
          name,
          parent_context_id: parentContextId,
        }),
        timeout: expect.any(Number),
      });
      expect(result).toBe(true);
    });

    it('should log verbose message on successful room creation', async () => {
      const response = createSuccessResponse({});
      mockAmqpConnection.request.mockResolvedValue(response);

      await adapter.createRoom(
        'room-123',
        AlkemioRoomType.DISCUSSION_FORUM,
        'Test Room'
      );

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'Created room: room-123',
        expect.any(String)
      );
    });
  });

  describe('sendMessage (T039)', () => {
    it('should pass actorId as sender_actor_id in payload', async () => {
      const response = createSuccessResponse({
        message_id: 'msg-123',
        timestamp: 1234567890123,
      });
      mockAmqpConnection.request.mockResolvedValue(response);

      const messageInput: CommunicationSendMessageInput = {
        roomID: 'room-uuid-123',
        actorId: 'actor-uuid-456',
        message: 'Hello, world!',
      };

      await adapter.sendMessage(messageInput);

      expect(mockAmqpConnection.request).toHaveBeenCalledWith({
        exchange: '',
        routingKey: MatrixAdapterEventType.COMMUNICATION_MESSAGE_SEND,
        payload: expect.objectContaining({
          alkemio_room_id: 'room-uuid-123',
          sender_actor_id: 'actor-uuid-456',
          content: 'Hello, world!',
        }),
        timeout: expect.any(Number),
      });
    });

    it('should return IMessage with correct structure', async () => {
      const response = createSuccessResponse({
        message_id: 'msg-123',
        timestamp: 1234567890123,
      });
      mockAmqpConnection.request.mockResolvedValue(response);

      const messageInput: CommunicationSendMessageInput = {
        roomID: 'room-uuid-123',
        actorId: 'actor-uuid-456',
        message: 'Test message',
      };

      const result = await adapter.sendMessage(messageInput);

      expect(result).toEqual({
        id: 'msg-123',
        message: 'Test message',
        sender: 'actor-uuid-456',
        timestamp: 1234567890123,
        threadID: undefined,
        reactions: [],
      });
    });

    it('should throw when roomID is empty', async () => {
      const messageInput: CommunicationSendMessageInput = {
        roomID: '',
        actorId: 'actor-uuid-456',
        message: 'Test message',
      };

      await expect(adapter.sendMessage(messageInput)).rejects.toThrow(
        CommunicationAdapterException
      );
    });

    it('should use ensureSuccess to throw on business logic errors', async () => {
      const response = createErrorResponse('NOT_ALLOWED', 'User not in room');
      mockAmqpConnection.request.mockResolvedValue(response);

      const messageInput: CommunicationSendMessageInput = {
        roomID: 'room-uuid-123',
        actorId: 'actor-uuid-456',
        message: 'Test message',
      };

      await expect(adapter.sendMessage(messageInput)).rejects.toThrow(
        CommunicationAdapterException
      );
    });
  });

  describe('error handling strategies (T040)', () => {
    describe('onError: throw (default)', () => {
      it('should throw CommunicationAdapterException on transport error', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Connection refused')
        );

        // listRooms uses ensureSuccess but should still throw on transport error
        await expect(adapter.listRooms()).rejects.toThrow(
          CommunicationAdapterException
        );
      });

      it('should include operation context in exception', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Connection refused')
        );

        await expect(adapter.listRooms()).rejects.toSatisfy((error: unknown) => {
          expect(error).toBeInstanceOf(CommunicationAdapterException);
          expect((error as CommunicationAdapterException).operation).toBe(
            'listRooms'
          );
          return true;
        });
      });
    });

    describe('onError: silent', () => {
      it('should return empty string on transport error for getMessageSenderActor', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Network error')
        );

        const result = await adapter.getMessageSenderActor({
          alkemioRoomId: 'room-123',
          messageId: 'msg-123',
        });

        expect(result).toBe('');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should return empty string on transport error for getReactionSenderActor', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Network error')
        );

        const result = await adapter.getReactionSenderActor({
          alkemioRoomId: 'room-123',
          reactionId: 'reaction-123',
        });

        expect(result).toBe('');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('onError: boolean', () => {
      it('should return false on transport error for deleteRoom', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Network error')
        );

        const result = await adapter.deleteRoom('room-123', 'Test deletion');

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should return false on transport error for batchAddMember', async () => {
        mockAmqpConnection.request.mockRejectedValue(
          new Error('Network error')
        );

        const result = await adapter.batchAddMember('actor-123', [
          'room-1',
          'room-2',
        ]);

        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to add actor to rooms - may already be member',
          expect.any(String)
        );
      });
    });

    describe('ensureSuccess option', () => {
      it('should throw when ensureSuccess is true and response.success is false', async () => {
        const response = createErrorResponse(
          'ROOM_NOT_FOUND',
          'Room does not exist'
        );
        mockAmqpConnection.request.mockResolvedValue(response);

        await expect(adapter.listRooms()).rejects.toThrow(
          CommunicationAdapterException
        );
      });

      it('should not throw when ensureSuccess is false and response.success is false', async () => {
        const response = createErrorResponse(
          'INTERNAL_ERROR',
          'Something went wrong'
        );
        mockAmqpConnection.request.mockResolvedValue(response);

        // syncActor does not use ensureSuccess, just returns the success boolean
        const result = await adapter.syncActor('actor-id', 'Display Name');

        expect(result).toBe(false);
      });
    });
  });

  describe('disabled communications', () => {
    let disabledAdapter: CommunicationAdapter;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CommunicationAdapter,
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn().mockReturnValue({ enabled: false }),
            },
          },
          {
            provide: WINSTON_MODULE_NEST_PROVIDER,
            useValue: mockLogger,
          },
          {
            provide: AmqpConnection,
            useValue: mockAmqpConnection,
          },
        ],
      }).compile();

      disabledAdapter = module.get<CommunicationAdapter>(CommunicationAdapter);
    });

    it('should return true for syncActor when disabled', async () => {
      const result = await disabledAdapter.syncActor(
        'actor-id',
        'Display Name'
      );

      expect(result).toBe(true);
      expect(mockAmqpConnection.request).not.toHaveBeenCalled();
    });

    it('should return true for createRoom when disabled', async () => {
      const result = await disabledAdapter.createRoom(
        'room-id',
        AlkemioRoomType.DISCUSSION_FORUM
      );

      expect(result).toBe(true);
      expect(mockAmqpConnection.request).not.toHaveBeenCalled();
    });

    it('should return empty array for listRooms when disabled', async () => {
      const result = await disabledAdapter.listRooms();

      expect(result).toEqual([]);
      expect(mockAmqpConnection.request).not.toHaveBeenCalled();
    });

    it('should return empty string for getMessageSenderActor when disabled', async () => {
      const result = await disabledAdapter.getMessageSenderActor({
        alkemioRoomId: 'room-123',
        messageId: 'msg-123',
      });

      expect(result).toBe('');
      expect(mockAmqpConnection.request).not.toHaveBeenCalled();
    });
  });
});
