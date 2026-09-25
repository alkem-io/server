import { ErrCodeRoomNotFound } from '@alkemio/matrix-adapter-lib';
import { RoomType } from '@common/enums/room.type';
import { ConversationRepairService } from '@domain/communication/conversation/conversation.repair.service';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { RoomReadinessRecord } from '@domain/communication/room/dto/room.readiness';
import { Room } from '@domain/communication/room/room.entity';
import { RoomReadinessService } from '@domain/communication/room/room.readiness.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { TaskService } from '@services/task';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked, vi } from 'vitest';
import {
  AdminCommunicationReconcileService,
  RECONCILE_BATCH_SIZE,
  RECONCILE_PROBE_CONCURRENCY,
} from './admin.communication.reconcile.service';

describe('AdminCommunicationReconcileService', () => {
  let service: AdminCommunicationReconcileService;
  let communicationAdapter: Mocked<CommunicationAdapter>;
  let roomReadinessService: Mocked<RoomReadinessService>;
  let conversationService: Mocked<ConversationService>;
  let conversationRepairService: Mocked<ConversationRepairService>;
  let taskService: Mocked<TaskService>;
  let rooms: any[];
  let queryBuilder: any;

  const roomNotFound = () =>
    CommunicationAdapterException.fromAdapterError('getRoomMembers', {
      code: ErrCodeRoomNotFound,
      message: 'no such room',
    });

  const room = (id: string, type: RoomType, state = 'UNKNOWN') => ({
    id,
    type,
    displayName: id,
    readiness: { state, reason: 'LEGACY_UNVERIFIED', updatedAt: 'x' },
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    rooms = [];
    // Keyset paging over `rooms` in array order: each query reads the rows
    // after the `afterId` it was given, up to its limit.
    let afterId: string | undefined;
    let limit = Number.POSITIVE_INFINITY;
    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn((_condition: string, params: { afterId: string }) => {
        afterId = params.afterId;
        return queryBuilder;
      }),
      limit: vi.fn((n: number) => {
        limit = n;
        return queryBuilder;
      }),
      getMany: vi.fn(async () => {
        const start = afterId ? rooms.findIndex(r => r.id === afterId) + 1 : 0;
        afterId = undefined;
        return rooms.slice(start, start + limit);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCommunicationReconcileService,
        repositoryProviderMockFactory(Room),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminCommunicationReconcileService);
    communicationAdapter = module.get(CommunicationAdapter);
    roomReadinessService = module.get(RoomReadinessService);
    conversationService = module.get(ConversationService);
    conversationRepairService = module.get(ConversationRepairService);
    taskService = module.get(TaskService);
    const roomRepository = module.get(getRepositoryToken(Room)) as any;
    roomRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    roomReadinessService.record.mockImplementation(async (r, write) => {
      r.readiness = { ...write, updatedAt: 'now' } as any;
      return {
        applied: true,
        changed: true,
        record: r.readiness as RoomReadinessRecord,
      };
    });
    taskService.create.mockResolvedValue({ id: 'task-1' } as any);
    taskService.updateTaskResults.mockResolvedValue(undefined);
    taskService.complete.mockResolvedValue(undefined);
    taskService.completeWithError.mockResolvedValue(undefined);
  });

  it('start() returns the task immediately and runs the sweep in the background', async () => {
    rooms = [room('r1', RoomType.CALLOUT)];
    communicationAdapter.getRoomMembers.mockResolvedValue(['a']);

    const task = await service.start({ repair: false, includeReady: false });

    expect(task.id).toBe('task-1');
    // let the fire-and-forget run settle
    await new Promise(resolve => setImmediate(resolve));
    expect(taskService.complete).toHaveBeenCalledWith('task-1');
  });

  it('probes only non-READY rooms by default and every room with includeReady', async () => {
    rooms = [];
    await service.run('task-1', { repair: false, includeReady: false });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining("readiness->>'state'"),
      { ready: 'READY' }
    );

    queryBuilder.where.mockClear();
    await service.run('task-1', { repair: false, includeReady: true });
    expect(queryBuilder.where).not.toHaveBeenCalled();
  });

  it('retires UNKNOWN: verified rooms become READY/VERIFIED, missing rooms FAILED/ROOM_MISSING, and the summary line is written', async () => {
    rooms = [
      room('r1', RoomType.CALLOUT),
      room('r2', RoomType.CONVERSATION_DIRECT),
      room('r3', RoomType.UPDATES),
    ];
    communicationAdapter.getRoomMembers.mockImplementation(async id => {
      if (id === 'r2') throw roomNotFound();
      return ['a'];
    });

    const summary = await service.run('task-1', {
      repair: false,
      includeReady: false,
    });

    expect(summary).toEqual({
      scanned: 3,
      ready: 2,
      failed: 1,
      repaired: 0,
      repairFailed: 0,
      unknownRemaining: 0,
    });
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      rooms[0],
      { state: 'READY', reason: 'VERIFIED' },
      'PROBE'
    );
    expect(roomReadinessService.record).toHaveBeenCalledWith(
      rooms[1],
      expect.objectContaining({ state: 'FAILED', reason: 'ROOM_MISSING' }),
      'PROBE'
    );
    expect(conversationRepairService.repair).not.toHaveBeenCalled();
    const lastResult = taskService.updateTaskResults.mock.calls.at(-1)?.[1];
    expect(JSON.parse(lastResult as string)).toEqual(summary);
    expect(taskService.complete).toHaveBeenCalledWith('task-1');
  });

  it('with repair: repairs missing conversation rooms only, never other kinds', async () => {
    rooms = [
      room('conv-room', RoomType.CONVERSATION_GROUP),
      room('callout-room', RoomType.CALLOUT),
    ];
    communicationAdapter.getRoomMembers.mockRejectedValue(roomNotFound());
    conversationService.findConversationByRoomId.mockResolvedValue({
      id: 'conv-1',
    } as any);
    conversationRepairService.repair.mockResolvedValue({
      outcome: 'ROOM_CREATED',
    } as any);

    const summary = await service.run('task-1', {
      repair: true,
      includeReady: false,
    });

    expect(conversationRepairService.repair).toHaveBeenCalledTimes(1);
    expect(conversationService.findConversationByRoomId).toHaveBeenCalledWith(
      'conv-room'
    );
    expect(summary).toEqual({
      scanned: 2,
      ready: 1,
      failed: 1,
      repaired: 1,
      repairFailed: 0,
      unknownRemaining: 0,
    });
  });

  it('counts a failed repair as repairFailed and leaves the room failed', async () => {
    rooms = [room('conv-room', RoomType.CONVERSATION_DIRECT)];
    communicationAdapter.getRoomMembers.mockRejectedValue(roomNotFound());
    conversationService.findConversationByRoomId.mockResolvedValue({
      id: 'conv-1',
    } as any);
    conversationRepairService.repair.mockResolvedValue({
      outcome: 'FAILED',
    } as any);

    const summary = await service.run('task-1', {
      repair: true,
      includeReady: false,
    });

    expect(summary).toMatchObject({ failed: 1, repaired: 0, repairFailed: 1 });
  });

  it('leaves readiness unchanged when the probe itself fails, counting UNKNOWN rooms as remaining', async () => {
    rooms = [
      room('r1', RoomType.CALLOUT, 'UNKNOWN'),
      room('r2', RoomType.CALLOUT, 'FAILED'),
    ];
    communicationAdapter.getRoomMembers.mockRejectedValue(
      CommunicationAdapterException.fromTransportError(
        'getRoomMembers',
        new Error('timeout')
      )
    );

    const summary = await service.run('task-1', {
      repair: true,
      includeReady: false,
    });

    expect(roomReadinessService.record).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      scanned: 2,
      ready: 0,
      failed: 0,
      unknownRemaining: 1,
    });
  });

  it('reads rooms in id-ordered batches and probes every one of them', async () => {
    rooms = Array.from({ length: RECONCILE_BATCH_SIZE + 3 }, (_, i) =>
      room(`r${i}`, RoomType.CALLOUT)
    );
    communicationAdapter.getRoomMembers.mockResolvedValue(['a']);

    const summary = await service.run('task-1', {
      repair: false,
      includeReady: true,
    });

    expect(queryBuilder.limit).toHaveBeenCalledWith(RECONCILE_BATCH_SIZE);
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('room.id', 'ASC');
    expect(queryBuilder.getMany).toHaveBeenCalledTimes(2);
    expect(communicationAdapter.getRoomMembers).toHaveBeenCalledTimes(
      RECONCILE_BATCH_SIZE + 3
    );
    expect(summary?.scanned).toBe(RECONCILE_BATCH_SIZE + 3);
  });

  it('probes with bounded concurrency', async () => {
    rooms = Array.from({ length: 12 }, (_, i) =>
      room(`r${i}`, RoomType.CALLOUT)
    );
    let inFlight = 0;
    let maxInFlight = 0;
    communicationAdapter.getRoomMembers.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 5));
      inFlight--;
      return ['a'];
    });

    await service.run('task-1', { repair: false, includeReady: true });

    expect(maxInFlight).toBe(RECONCILE_PROBE_CONCURRENCY);
    expect(communicationAdapter.getRoomMembers).toHaveBeenCalledTimes(12);
  });

  it('completes the task with an error when the sweep itself fails', async () => {
    queryBuilder.getMany.mockRejectedValue(new Error('db down'));

    const summary = await service.run('task-1', {
      repair: false,
      includeReady: false,
    });

    expect(summary).toBeUndefined();
    expect(taskService.completeWithError).toHaveBeenCalledWith(
      'task-1',
      expect.stringContaining('db down')
    );
    expect(taskService.complete).not.toHaveBeenCalled();
  });
});
