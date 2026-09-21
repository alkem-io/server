import { RoomType } from '@common/enums/room.type';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { ProxySurfaceUsageService } from './proxy.surface.usage.service';

describe('ProxySurfaceUsageService', () => {
  let service: ProxySurfaceUsageService;
  let pipeline: {
    hincrby: ReturnType<typeof vi.fn>;
    hset: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
  };
  let redis: { pipeline: ReturnType<typeof vi.fn> };
  let logger: any;

  const webMatrixReq = {
    authenticationMethod: 'cookie-session',
    headers: { 'x-alkemio-messaging-transport': 'matrix' },
  };
  const webReq = { authenticationMethod: 'cookie-session', headers: {} };
  const mcpReq = {
    authenticationMethod: 'mcp-api-key',
    headers: { 'x-alkemio-messaging-transport': 'matrix' },
  };

  const build = async (config: {
    enabled: boolean;
    flush_interval_ms: number;
  }) => {
    pipeline = {
      hincrby: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    redis = { pipeline: vi.fn().mockReturnValue(pipeline) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxySurfaceUsageService,
        MockWinstonProvider,
        { provide: MESSAGING_REDIS_CLIENT, useValue: redis },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(config) },
        },
      ],
    }).compile();
    service = module.get(ProxySurfaceUsageService);
    logger = module.get(MockWinstonProvider.provide);
    logger.error.mockClear?.();
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    await build({ enabled: true, flush_interval_ms: 10_000 });
  });

  describe('record', () => {
    it('aggregates in-process by surface × disposition × caller class × room kind × media, without touching Redis', () => {
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webMatrixReq,
      });
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webMatrixReq,
      });
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webReq,
      });
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CALLOUT,
        req: webReq,
      });
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        media: true,
        req: webReq,
      });
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: mcpReq,
      });

      expect(Object.fromEntries(service.pendingBuckets())).toEqual({
        'Mutation.sendMessageToRoom|MIGRATED_BROWSER_DATA_PLANE|WEB_MATRIX|conversation_direct|0': 2,
        'Mutation.sendMessageToRoom|MIGRATED_BROWSER_DATA_PLANE|WEB_GRAPHQL|conversation_direct|0': 1,
        'Mutation.sendMessageToRoom|LATER_MATRIX_ROOM_SCOPE|WEB_GRAPHQL|callout|0': 1,
        'Mutation.sendMessageToRoom|RETAINED_MEDIA_SEAM|WEB_GRAPHQL|conversation_direct|1': 1,
        'Mutation.sendMessageToRoom|MIGRATED_BROWSER_DATA_PLANE|MCP|conversation_direct|0': 1,
      });
      expect(redis.pipeline).not.toHaveBeenCalled();
    });

    it('never counts retained control-plane surfaces', () => {
      service.record({
        surface: 'Mutation.createConversation',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webReq,
      });
      service.record({
        surface: 'Subscription.conversationGovernanceEvents',
        req: webReq,
      });
      service.record({
        surface: 'Mutation.repairConversationRoom',
        req: webReq,
      });
      expect(service.pendingBuckets().size).toBe(0);
    });

    it('counts a room-less subscription registration with room kind "-"', () => {
      service.record({
        surface: 'Subscription.conversationEvents',
        req: webReq,
      });
      expect([...service.pendingBuckets().keys()]).toEqual([
        'Subscription.conversationEvents|MIGRATED_BROWSER_DATA_PLANE|WEB_GRAPHQL|-|0',
      ]);
    });

    it('ignores (and warns once about) an unclassified surface', () => {
      service.record({ surface: 'Mutation.somethingNew', req: webReq });
      service.record({ surface: 'Mutation.somethingNew', req: webReq });
      expect(service.pendingBuckets().size).toBe(0);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush', () => {
    const now = new Date('2026-09-21T10:07:30.000Z');

    it('writes one pipeline with HINCRBY per bucket, the liveness minute and both expiries, then clears the buckets', async () => {
      service.record({
        surface: 'Room.messages',
        roomType: RoomType.CONVERSATION_GROUP,
        req: webReq,
      });
      service.record({
        surface: 'Room.messages',
        roomType: RoomType.CONVERSATION_GROUP,
        req: webReq,
      });

      await service.flush(now);

      expect(redis.pipeline).toHaveBeenCalledTimes(1);
      expect(pipeline.hincrby).toHaveBeenCalledTimes(1);
      expect(pipeline.hincrby).toHaveBeenCalledWith(
        'msg:proxy:usage:2026-09-21',
        'Room.messages|MIGRATED_BROWSER_DATA_PLANE|WEB_GRAPHQL|conversation_group|0',
        2
      );
      expect(pipeline.hset).toHaveBeenCalledWith(
        'msg:proxy:live:2026-09-21',
        '10:07',
        '1'
      );
      expect(pipeline.expire).toHaveBeenCalledWith(
        'msg:proxy:usage:2026-09-21',
        45 * 24 * 60 * 60
      );
      expect(pipeline.expire).toHaveBeenCalledWith(
        'msg:proxy:live:2026-09-21',
        45 * 24 * 60 * 60
      );
      expect(pipeline.exec).toHaveBeenCalledTimes(1);
      expect(service.pendingBuckets().size).toBe(0);
    });

    it('marks liveness even when nothing was counted', async () => {
      await service.flush(now);
      expect(pipeline.hincrby).not.toHaveBeenCalled();
      expect(pipeline.hset).toHaveBeenCalledWith(
        'msg:proxy:live:2026-09-21',
        '10:07',
        '1'
      );
    });

    it('fails open: a Redis error drops the interval and logs, without throwing', async () => {
      pipeline.exec.mockRejectedValue(new Error('connection refused'));
      service.record({
        surface: 'Room.unreadCount',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webReq,
      });

      await expect(service.flush(now)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(service.pendingBuckets().size).toBe(0);
    });

    it('treats a per-command error in the pipeline result as a failed flush', async () => {
      pipeline.exec.mockResolvedValue([[new Error('OOM'), null]]);
      await service.flush(now);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('kill switch', () => {
    beforeEach(async () => {
      await build({ enabled: false, flush_interval_ms: 10_000 });
    });

    it('stops counting and liveness alike', async () => {
      service.record({
        surface: 'Mutation.sendMessageToRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webReq,
      });
      await service.flush();
      service.onModuleInit();

      expect(service.pendingBuckets().size).toBe(0);
      expect(redis.pipeline).not.toHaveBeenCalled();
      expect(service.isEnabled).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('flushes on shutdown', async () => {
      service.record({
        surface: 'Mutation.markMessageAsReadInRoom',
        roomType: RoomType.CONVERSATION_DIRECT,
        req: webReq,
      });
      service.onModuleInit();
      await service.onApplicationShutdown();
      expect(pipeline.hincrby).toHaveBeenCalledTimes(1);
      expect(pipeline.exec).toHaveBeenCalledTimes(1);
    });
  });
});
