import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationDigestFlushService } from './conversation.digest.flush.service';
import { ConversationDigestSchedulerService } from './conversation.digest.scheduler.service';
import { ConversationDigestSweepService } from './conversation.digest.sweep.service';

const mockScheduler = {
  claimDue: vi.fn(),
  config: { sweepIntervalSeconds: 10 },
};
const mockFlush = { flush: vi.fn() };

describe('ConversationDigestSweepService (FR-021 / D-25)', () => {
  let service: ConversationDigestSweepService;
  let schedulerRegistry: SchedulerRegistry;

  const build = async (enabled = true, withScheduler = true) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationDigestSweepService,
        {
          provide: ConversationDigestSchedulerService,
          useValue: mockScheduler,
        },
        { provide: ConversationDigestFlushService, useValue: mockFlush },
        ...(withScheduler ? [SchedulerRegistry] : []),
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) =>
              key === 'notifications.messaging.enabled' ? enabled : undefined
            ),
          },
        },
        MockWinstonProvider,
      ],
    }).compile();

    schedulerRegistry = withScheduler
      ? module.get(SchedulerRegistry)
      : (undefined as unknown as SchedulerRegistry);
    return module.get(ConversationDigestSweepService);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockScheduler.claimDue.mockResolvedValue([]);
    mockFlush.flush.mockResolvedValue(undefined);
    service = await build();
  });

  afterEach(() => {
    service?.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('registration', () => {
    it('registers an interval at the configured sweep period', async () => {
      vi.useFakeTimers();
      service.onModuleInit();

      expect(
        schedulerRegistry.doesExist('interval', 'messaging-digest-sweep')
      ).toBe(true);
    });

    it('FR-016: the kill switch disables the flush half of the feature too', async () => {
      service = await build(false);
      service.onModuleInit();

      expect(
        schedulerRegistry.doesExist('interval', 'messaging-digest-sweep')
      ).toBe(false);
    });

    // Regression: MessageInboxModule is reachable from AuthResetWorkerModule
    // (AuthResetSubscriberModule -> SpaceModule -> CommunityModule ->
    // CommunicationModule -> MessageInboxModule) and that worker deliberately
    // does not import ScheduleModule. A REQUIRED SchedulerRegistry made
    // NestFactory.create(AuthResetWorkerModule) fail to resolve this provider,
    // crash-looping the worker pod and stopping all authorization resets.
    it('resolves and no-ops in a module graph that has no SchedulerRegistry', async () => {
      service = await build(true, false);

      expect(service).toBeDefined();
      expect(() => service.onModuleInit()).not.toThrow();
      expect(() => service.onModuleDestroy()).not.toThrow();
    });

    it('still sweeps on demand without a registry, so nothing silently breaks', async () => {
      service = await build(true, false);
      mockScheduler.claimDue.mockResolvedValue(['push:direct:user-1']);

      await service.tick();

      expect(mockFlush.flush).toHaveBeenCalledWith('push:direct:user-1');
    });

    it('tears the interval down on shutdown', async () => {
      vi.useFakeTimers();
      service.onModuleInit();
      service.onModuleDestroy();

      expect(
        schedulerRegistry.doesExist('interval', 'messaging-digest-sweep')
      ).toBe(false);
    });
  });

  describe('tick', () => {
    it('claims due tracks and flushes each one', async () => {
      mockScheduler.claimDue.mockResolvedValue([
        'push:direct:user-1',
        'email:group:user-2',
      ]);

      await service.tick();

      expect(mockFlush.flush).toHaveBeenCalledTimes(2);
      expect(mockFlush.flush).toHaveBeenCalledWith('push:direct:user-1');
      expect(mockFlush.flush).toHaveBeenCalledWith('email:group:user-2');
    });

    it('does nothing when nothing is due', async () => {
      await service.tick();

      expect(mockFlush.flush).not.toHaveBeenCalled();
    });

    it('a tick that throws must NOT kill the scheduler', async () => {
      mockScheduler.claimDue.mockRejectedValue(new Error('redis down'));

      await expect(service.tick()).resolves.toBeUndefined();

      // And the next tick still runs.
      mockScheduler.claimDue.mockResolvedValue(['push:direct:user-1']);
      await service.tick();
      expect(mockFlush.flush).toHaveBeenCalledWith('push:direct:user-1');
    });

    it('bounds concurrency rather than flushing a whole batch at once', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      mockFlush.flush.mockImplementation(async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight--;
      });
      mockScheduler.claimDue.mockResolvedValue(
        Array.from({ length: 35 }, (_, i) => `push:direct:user-${i}`)
      );

      await service.tick();

      expect(mockFlush.flush).toHaveBeenCalledTimes(35);
      expect(maxInFlight).toBeGreaterThan(1);
      expect(maxInFlight).toBeLessThanOrEqual(10);
    });

    it('skips a tick that fires while the previous one is still running', async () => {
      let release: () => void = () => {};
      mockScheduler.claimDue.mockImplementation(
        () =>
          new Promise(resolve => {
            release = () => resolve([]);
          })
      );

      const first = service.tick();
      await service.tick(); // must be a no-op, not a second claim

      expect(mockScheduler.claimDue).toHaveBeenCalledTimes(1);
      release();
      await first;
    });
  });
});
