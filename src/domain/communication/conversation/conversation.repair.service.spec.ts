import { ErrCodeRoomNotFound } from '@alkemio/matrix-adapter-lib';
import { RoomType } from '@common/enums/room.type';
import { RoomReadinessRecord } from '@domain/communication/room/dto/room.readiness';
import { RoomReadinessService } from '@domain/communication/room/room.readiness.service';
import { RoomService } from '@domain/communication/room/room.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ConversationRepairService } from './conversation.repair.service';
import { ConversationService } from './conversation.service';
import { ConversationRoomRepairOutcome } from './dto/conversation.repair.result';

describe('ConversationRepairService', () => {
  let service: ConversationRepairService;
  let conversationService: Mocked<ConversationService>;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let roomService: Mocked<RoomService>;
  let roomReadinessService: Mocked<RoomReadinessService>;

  const roomNotFound = () =>
    CommunicationAdapterException.fromAdapterError('getRoomMembers', {
      code: ErrCodeRoomNotFound,
      message: 'no such room',
    });
  const timeout = () =>
    CommunicationAdapterException.fromTransportError(
      'getRoomMembers',
      new Error('Failed to receive response within timeout of 30000ms')
    );

  const makeConversation = (readiness?: any) =>
    ({
      id: 'conv-1',
      room: {
        id: 'room-1',
        type: RoomType.CONVERSATION_GROUP,
        displayName: 'group',
        readiness,
      },
    }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationRepairService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversationRepairService);
    conversationService = module.get(ConversationService);
    communicationAdapter = module.get(CommunicationAdapter);
    roomService = module.get(RoomService);
    roomReadinessService = module.get(RoomReadinessService);

    conversationService.getConversationMemberActorIds.mockResolvedValue([
      'a',
      'b',
    ]);
    roomReadinessService.record.mockImplementation(async (room, write) => {
      room.readiness = { ...write, updatedAt: 'now' } as any;
      return {
        applied: true,
        changed: true,
        record: room.readiness as RoomReadinessRecord,
      };
    });
    communicationAdapter.batchAddMember.mockResolvedValue(true);
    communicationAdapter.batchRemoveMember.mockResolvedValue(true);
    roomService.requestExternalRoomCreation.mockResolvedValue(undefined);
  });

  it('ROOM_CREATED: the probe finds no room, creation succeeds, readiness READY/PROVISIONED', async () => {
    const conversation = makeConversation({
      state: 'FAILED',
      reason: 'ADAPTER_TIMEOUT',
    });
    communicationAdapter.getRoomMembers.mockRejectedValue(roomNotFound());

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.ROOM_CREATED);
    expect(roomService.requestExternalRoomCreation).toHaveBeenCalledWith(
      conversation.room,
      expect.objectContaining({ initialMembers: ['a', 'b'] })
    );
    expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      conversation.room,
      { state: 'READY', reason: 'PROVISIONED' },
      'PROBE'
    );
    expect(result.readiness.state).toBe('READY');
    expect(result.membersAdded).toBe(0);
    expect(result.membersRemoved).toBe(0);
  });

  it('ROOM_VERIFIED: the probe finds the room with matching members, no creation request', async () => {
    const conversation = makeConversation({
      state: 'READY',
      reason: 'PROVISIONED',
    });
    communicationAdapter.getRoomMembers.mockResolvedValue(['b', 'a']);

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.ROOM_VERIFIED);
    expect(roomService.requestExternalRoomCreation).not.toHaveBeenCalled();
    expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
    expect(result.membersAdded).toBe(0);
    expect(result.membersRemoved).toBe(0);
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      conversation.room,
      { state: 'READY', reason: 'VERIFIED' },
      'PROBE'
    );
  });

  it('MEMBERSHIP_CONVERGED: adds missing and removes extra members with exact counts', async () => {
    const conversation = makeConversation({
      state: 'READY',
      reason: 'PROVISIONED',
    });
    conversationService.getConversationMemberActorIds.mockResolvedValue([
      'a',
      'b',
      'c',
    ]);
    communicationAdapter.getRoomMembers.mockResolvedValue(['a', 'x']);

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(
      ConversationRoomRepairOutcome.MEMBERSHIP_CONVERGED
    );
    expect(communicationAdapter.batchAddMember).toHaveBeenCalledTimes(2);
    expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith('b', [
      'room-1',
    ]);
    expect(communicationAdapter.batchAddMember).toHaveBeenCalledWith('c', [
      'room-1',
    ]);
    expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledWith(
      'x',
      ['room-1'],
      expect.any(String),
      { ensureAllSucceeded: true }
    );
    expect(result.membersAdded).toBe(2);
    expect(result.membersRemoved).toBe(1);
  });

  it('FAILED at probe: readiness FAILED with the adapter reason, no creation, no membership calls', async () => {
    const conversation = makeConversation({
      state: 'UNKNOWN',
      reason: 'LEGACY_UNVERIFIED',
    });
    communicationAdapter.getRoomMembers.mockRejectedValue(timeout());

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.FAILED);
    expect(roomService.requestExternalRoomCreation).not.toHaveBeenCalled();
    expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      conversation.room,
      expect.objectContaining({ state: 'FAILED', reason: 'ADAPTER_TIMEOUT' }),
      'PROBE'
    );
    expect(result.readiness.state).toBe('FAILED');
    expect(result.detail).toMatch(/probe/);
  });

  it('FAILED at creation: readiness FAILED with the adapter reason', async () => {
    const conversation = makeConversation({
      state: 'FAILED',
      reason: 'ADAPTER_TIMEOUT',
    });
    communicationAdapter.getRoomMembers.mockRejectedValue(roomNotFound());
    roomService.requestExternalRoomCreation.mockRejectedValue(
      CommunicationAdapterException.fromTransportError(
        'createRoom',
        new Error('channel closed')
      )
    );

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.FAILED);
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      conversation.room,
      expect.objectContaining({
        state: 'FAILED',
        reason: 'ADAPTER_UNAVAILABLE',
      }),
      'PROBE'
    );
    expect(result.detail).toMatch(/creation/);
  });

  it('FAILED on a rejected removal: readiness untouched, counts reflect the successful steps, detail names the step', async () => {
    const readiness = { state: 'READY', reason: 'PROVISIONED', updatedAt: 'x' };
    const conversation = makeConversation(readiness);
    conversationService.getConversationMemberActorIds.mockResolvedValue([
      'a',
      'b',
    ]);
    communicationAdapter.getRoomMembers.mockResolvedValue(['a', 'x']);
    communicationAdapter.batchRemoveMember.mockRejectedValue(
      CommunicationAdapterException.fromAdapterError('batchRemoveMember', {
        code: 'NOT_ALLOWED',
        message: 'insufficient power level',
      })
    );

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.FAILED);
    expect(result.membersAdded).toBe(1);
    expect(result.membersRemoved).toBe(0);
    expect(result.detail).toMatch(/removing a member/);
    expect(roomReadinessService.record).not.toHaveBeenCalled();
    expect(conversation.room.readiness).toBe(readiness);
    expect(result.readiness.state).toBe('READY');
  });

  it('FAILED on a rejected add: readiness untouched, detail names the step', async () => {
    const conversation = makeConversation({
      state: 'READY',
      reason: 'PROVISIONED',
      updatedAt: 'x',
    });
    communicationAdapter.getRoomMembers.mockResolvedValue(['a']);
    communicationAdapter.batchAddMember.mockResolvedValue(false);

    const result = await service.repair(conversation);

    expect(result.outcome).toBe(ConversationRoomRepairOutcome.FAILED);
    expect(result.detail).toMatch(/adding a member/);
    expect(roomReadinessService.record).not.toHaveBeenCalled();
  });

  it('a concurrent second repair finds the room and reports ROOM_VERIFIED with zero counts', async () => {
    const conversation = makeConversation({
      state: 'READY',
      reason: 'PROVISIONED',
    });
    communicationAdapter.getRoomMembers
      .mockRejectedValueOnce(roomNotFound())
      .mockResolvedValueOnce(['a', 'b']);

    const [first, second] = await Promise.all([
      service.repair(conversation),
      service.repair(conversation),
    ]);

    expect(first.outcome).toBe(ConversationRoomRepairOutcome.ROOM_CREATED);
    expect(second.outcome).toBe(ConversationRoomRepairOutcome.ROOM_VERIFIED);
    expect(second.membersAdded + second.membersRemoved).toBe(0);
    expect(roomService.requestExternalRoomCreation).toHaveBeenCalledTimes(1);
  });

  it('loads the room when the conversation was fetched without it', async () => {
    const conversation = { id: 'conv-1' } as any;
    const room = { id: 'room-1', type: RoomType.CONVERSATION_DIRECT } as any;
    conversationService.getRoom.mockResolvedValue(room);
    communicationAdapter.getRoomMembers.mockResolvedValue(['a', 'b']);

    const result = await service.repair(conversation);

    expect(conversationService.getRoom).toHaveBeenCalledWith('conv-1');
    expect(result.outcome).toBe(ConversationRoomRepairOutcome.ROOM_VERIFIED);
  });
});
