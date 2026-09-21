import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationAdapterException } from '@services/adapters/communication-adapter/communication.adapter.exception';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { RoomLookupService } from '../room-lookup/room.lookup.service';
import {
  RoomReadinessReason,
  RoomReadinessRecord,
  RoomReadinessState,
} from './dto/room.readiness';
import { IRoom } from './room.interface';
import {
  ROOM_READINESS_CHANGED_EVENT,
  RoomReadinessChangedEvent,
} from './room.readiness.changed.event';
import {
  describeAdapterFailure,
  RoomReadinessService,
} from './room.readiness.service';

const { READY, PENDING, FAILED, UNKNOWN } = RoomReadinessState;
const R = RoomReadinessReason;

describe('RoomReadinessService', () => {
  let service: RoomReadinessService;
  let roomLookupService: Mocked<RoomLookupService>;
  let eventEmitter: { emitAsync: ReturnType<typeof vi.fn> };

  const makeRoom = (readiness?: RoomReadinessRecord): IRoom =>
    ({ id: 'room-1', readiness }) as unknown as IRoom;
  const record = (
    state: RoomReadinessState,
    reason: RoomReadinessReason
  ): RoomReadinessRecord => ({
    state,
    reason,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    eventEmitter = { emitAsync: vi.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomReadinessService,
        MockWinstonProvider,
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomReadinessService);
    roomLookupService = module.get(RoomLookupService);
    roomLookupService.updatePartial.mockResolvedValue(undefined);
  });

  describe('legal transitions', () => {
    it.each([
      [
        'creation → READY/PROVISIONED',
        undefined,
        READY,
        R.PROVISIONED,
        'PROVISIONING',
      ],
      [
        'creation → FAILED/ADAPTER_TIMEOUT',
        undefined,
        FAILED,
        R.ADAPTER_TIMEOUT,
        'PROVISIONING',
      ],
      [
        'creation → PENDING/AWAITING_CONFIRMATION',
        undefined,
        PENDING,
        R.AWAITING_CONFIRMATION,
        'PROVISIONING',
      ],
      [
        'creation over the read-back column default → READY',
        record(UNKNOWN, R.LEGACY_UNVERIFIED),
        READY,
        R.PROVISIONED,
        'PROVISIONING',
      ],
      [
        'UNKNOWN → READY by probe',
        record(UNKNOWN, R.LEGACY_UNVERIFIED),
        READY,
        R.VERIFIED,
        'PROBE',
      ],
      [
        'UNKNOWN → READY by confirmation',
        record(UNKNOWN, R.LEGACY_UNVERIFIED),
        READY,
        R.CONFIRMED,
        'BACKEND_CONFIRMATION',
      ],
      [
        'UNKNOWN → FAILED by probe',
        record(UNKNOWN, R.LEGACY_UNVERIFIED),
        FAILED,
        R.ROOM_MISSING,
        'PROBE',
      ],
      [
        'PENDING → READY by confirmation',
        record(PENDING, R.AWAITING_CONFIRMATION),
        READY,
        R.CONFIRMED,
        'BACKEND_CONFIRMATION',
      ],
      [
        'PENDING → READY by probe',
        record(PENDING, R.AWAITING_CONFIRMATION),
        READY,
        R.VERIFIED,
        'PROBE',
      ],
      [
        'PENDING → FAILED by probe',
        record(PENDING, R.AWAITING_CONFIRMATION),
        FAILED,
        R.ROOM_MISSING,
        'PROBE',
      ],
      [
        'FAILED → READY by probe (repair)',
        record(FAILED, R.ADAPTER_TIMEOUT),
        READY,
        R.PROVISIONED,
        'PROBE',
      ],
      [
        'FAILED → FAILED by probe (new reason)',
        record(FAILED, R.ADAPTER_TIMEOUT),
        FAILED,
        R.ADAPTER_UNAVAILABLE,
        'PROBE',
      ],
      [
        'READY → READY by probe (verified)',
        record(READY, R.PROVISIONED),
        READY,
        R.VERIFIED,
        'PROBE',
      ],
      [
        'READY → FAILED/ROOM_MISSING by probe',
        record(READY, R.PROVISIONED),
        FAILED,
        R.ROOM_MISSING,
        'PROBE',
      ],
    ] as const)('%s', async (_label, previous, state, reason, source) => {
      const room = makeRoom(previous);
      const result = await service.record(room, { state, reason }, source);

      expect(result.applied).toBe(true);
      expect(result.record.state).toBe(state);
      expect(result.record.reason).toBe(reason);
      expect(roomLookupService.updatePartial).toHaveBeenCalledWith('room-1', {
        readiness: expect.objectContaining({ state, reason }),
      });
      expect(room.readiness).toEqual(result.record);
    });
  });

  describe('illegal transitions are ignored, never thrown', () => {
    it.each([
      [
        'READY → PENDING',
        record(READY, R.PROVISIONED),
        PENDING,
        R.AWAITING_CONFIRMATION,
        'PROBE',
      ],
      [
        'READY → FAILED from a non-probe caller',
        record(READY, R.PROVISIONED),
        FAILED,
        R.ADAPTER_TIMEOUT,
        'BACKEND_CONFIRMATION',
      ],
      [
        'READY → FAILED by probe for a non-missing reason',
        record(READY, R.PROVISIONED),
        FAILED,
        R.ADAPTER_TIMEOUT,
        'PROBE',
      ],
      [
        'READY → FAILED by provisioning (writes once)',
        record(READY, R.PROVISIONED),
        FAILED,
        R.ADAPTER_TIMEOUT,
        'PROVISIONING',
      ],
      [
        'UNKNOWN → FAILED by confirmation',
        record(UNKNOWN, R.LEGACY_UNVERIFIED),
        FAILED,
        R.ROOM_MISSING,
        'BACKEND_CONFIRMATION',
      ],
      [
        'FAILED → READY by confirmation',
        record(FAILED, R.ADAPTER_TIMEOUT),
        READY,
        R.CONFIRMED,
        'BACKEND_CONFIRMATION',
      ],
      [
        'anything → UNKNOWN',
        record(READY, R.PROVISIONED),
        UNKNOWN,
        R.LEGACY_UNVERIFIED,
        'PROBE',
      ],
      [
        'creation → UNKNOWN',
        undefined,
        UNKNOWN,
        R.LEGACY_UNVERIFIED,
        'PROVISIONING',
      ],
      ['creation by a probe', undefined, READY, R.VERIFIED, 'PROBE'],
    ] as const)('%s', async (_label, previous, state, reason, source) => {
      const room = makeRoom(previous);
      const result = await service.record(room, { state, reason }, source);

      expect(result.applied).toBe(false);
      expect(result.changed).toBe(false);
      expect(roomLookupService.updatePartial).not.toHaveBeenCalled();
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(room.readiness).toBe(previous);
    });
  });

  describe('change notification', () => {
    it('emits the changed event once when state or reason changed', async () => {
      const room = makeRoom(record(FAILED, R.ADAPTER_TIMEOUT));
      const result = await service.record(
        room,
        { state: READY, reason: R.PROVISIONED },
        'PROBE'
      );

      expect(result.changed).toBe(true);
      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
      const [name, event] = eventEmitter.emitAsync.mock.calls[0];
      expect(name).toBe(ROOM_READINESS_CHANGED_EVENT);
      expect(event).toBeInstanceOf(RoomReadinessChangedEvent);
      expect((event as RoomReadinessChangedEvent).previous?.state).toBe(FAILED);
      expect((event as RoomReadinessChangedEvent).current.state).toBe(READY);
    });

    it('emits nothing on an unchanged write (same state and reason)', async () => {
      const room = makeRoom(record(READY, R.VERIFIED));
      const result = await service.record(
        room,
        { state: READY, reason: R.VERIFIED },
        'PROBE'
      );

      expect(result.applied).toBe(true);
      expect(result.changed).toBe(false);
      expect(roomLookupService.updatePartial).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('emits at creation too, so listeners can decide what to do with it', async () => {
      const room = makeRoom(undefined);
      await service.record(
        room,
        { state: FAILED, reason: R.ADAPTER_UNAVAILABLE },
        'PROVISIONING'
      );
      expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(1);
      expect(
        (eventEmitter.emitAsync.mock.calls[0][1] as RoomReadinessChangedEvent)
          .previous
      ).toBeUndefined();
    });

    it('keeps the persisted write when a listener throws', async () => {
      eventEmitter.emitAsync.mockRejectedValue(new Error('publish failed'));
      const room = makeRoom(record(FAILED, R.ADAPTER_TIMEOUT));

      const result = await service.record(
        room,
        { state: READY, reason: R.PROVISIONED },
        'PROBE'
      );

      expect(result.applied).toBe(true);
      expect(room.readiness?.state).toBe(READY);
    });
  });

  describe('describeAdapterFailure', () => {
    it('maps a transport timeout to ADAPTER_TIMEOUT', () => {
      const failure = describeAdapterFailure(
        CommunicationAdapterException.fromTransportError(
          'createRoom',
          new Error('Failed to receive response within timeout of 30000ms')
        )
      );
      expect(failure.reason).toBe(R.ADAPTER_TIMEOUT);
      expect(failure.detail.length).toBeLessThanOrEqual(200);
    });

    it('maps an unreachable adapter to ADAPTER_UNAVAILABLE', () => {
      expect(
        describeAdapterFailure(
          CommunicationAdapterException.fromTransportError(
            'createRoom',
            new Error('channel closed')
          )
        ).reason
      ).toBe(R.ADAPTER_UNAVAILABLE);
    });

    it('maps an adapter business error to ADAPTER_REJECTED and anything else to UNKNOWN', () => {
      expect(
        describeAdapterFailure(
          CommunicationAdapterException.fromAdapterError('createRoom', {
            code: 'MATRIX_ERROR',
            message: 'M_UNKNOWN',
          })
        ).reason
      ).toBe(R.ADAPTER_REJECTED);
      expect(describeAdapterFailure(new Error('boom')).reason).toBe(R.UNKNOWN);
    });
  });

  describe('sanitizeDetail', () => {
    it('returns undefined for empty input', () => {
      expect(service.sanitizeDetail(undefined)).toBeUndefined();
      expect(service.sanitizeDetail('')).toBeUndefined();
      expect(service.sanitizeDetail('   ')).toBeUndefined();
    });

    it('strips backend room ids, user ids and media URIs', () => {
      const out = service.sanitizeDetail(
        'Room !abc123:matrix.example.org rejected @user:matrix.example.org avatar mxc://matrix.example.org/xyz'
      );
      expect(out).not.toMatch(/!abc123/);
      expect(out).not.toMatch(/@user/);
      expect(out).not.toMatch(/mxc:\/\//);
      expect(out).not.toMatch(/matrix\.example\.org/);
    });

    it('strips URLs and hostnames', () => {
      const out = service.sanitizeDetail(
        'connect ECONNREFUSED to https://adapter.internal:8080/rpc via rabbitmq.svc.cluster.local:5672'
      );
      expect(out).not.toMatch(/https?:\/\//);
      expect(out).not.toMatch(/adapter\.internal/);
      expect(out).not.toMatch(/svc\.cluster\.local/);
      expect(out).toContain('ECONNREFUSED');
    });

    it('drops stack frames', () => {
      const out = service.sanitizeDetail(
        'Timeout waiting for reply\n    at CommunicationAdapter.sendCommand (communication.adapter.ts:210:15)\n    at async RoomService.createRoom'
      );
      expect(out).toBe('Timeout waiting for reply');
    });

    it('bounds the result to 200 characters', () => {
      const out = service.sanitizeDetail('x'.repeat(500));
      expect(out?.length).toBeLessThanOrEqual(200);
    });

    it('is applied to the persisted record', async () => {
      const room = makeRoom(undefined);
      const result = await service.record(
        room,
        {
          state: FAILED,
          reason: R.ADAPTER_UNAVAILABLE,
          detail: 'transport error reaching https://adapter.internal',
        },
        'PROVISIONING'
      );
      expect(result.record.detail).toBe('transport error reaching [redacted]');
    });
  });
});
