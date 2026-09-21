import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { vi } from 'vitest';
import { ProxySurfaceUsageReadService } from './proxy.surface.usage.read.service';

describe('ProxySurfaceUsageReadService', () => {
  let service: ProxySurfaceUsageReadService;
  let store: Record<string, Record<string, string>>;
  const now = new Date('2026-09-21T10:07:30.000Z');

  beforeEach(async () => {
    store = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxySurfaceUsageReadService,
        {
          provide: MESSAGING_REDIS_CLIENT,
          useValue: { hgetall: vi.fn(async (key: string) => store[key] ?? {}) },
        },
      ],
    }).compile();
    service = module.get(ProxySurfaceUsageReadService);
  });

  it('assembles rows per day, oldest first, omitting days without any data', async () => {
    store['msg:proxy:usage:2026-09-19'] = {
      'Mutation.sendMessageToRoom|MIGRATED_BROWSER_DATA_PLANE|WEB_MATRIX|conversation_direct|0':
        '3',
      'Subscription.conversationEvents|MIGRATED_BROWSER_DATA_PLANE|WEB_GRAPHQL|-|0':
        '1',
    };
    store['msg:proxy:live:2026-09-19'] = Object.fromEntries(
      Array.from({ length: 1440 }, (_, i) => [`m${i}`, '1'])
    );
    store['msg:proxy:live:2026-09-21'] = { '10:06': '1', '10:07': '1' };

    const result = await service.read(3, now);

    expect(result.from).toBe('2026-09-19');
    expect(result.to).toBe('2026-09-21');
    expect(result.days.map(d => d.day)).toEqual(['2026-09-19', '2026-09-21']);

    const [past, today] = result.days;
    expect(past.livenessMinutes).toBe(1440);
    expect(past.expectedMinutes).toBe(1440);
    expect(past.rows).toEqual([
      {
        surface: 'Mutation.sendMessageToRoom',
        disposition: 'MIGRATED_BROWSER_DATA_PLANE',
        callerClass: 'WEB_MATRIX',
        roomType: 'conversation_direct',
        media: false,
        count: 3,
      },
      {
        surface: 'Subscription.conversationEvents',
        disposition: 'MIGRATED_BROWSER_DATA_PLANE',
        callerClass: 'WEB_GRAPHQL',
        roomType: undefined,
        media: false,
        count: 1,
      },
    ]);

    expect(today.rows).toEqual([]);
    expect(today.livenessMinutes).toBe(2);
    expect(today.expectedMinutes).toBe(10 * 60 + 7 + 1);
  });

  it('reports a quiet but live day with zero rows, never omitting it', async () => {
    store['msg:proxy:live:2026-09-20'] = { '00:00': '1' };
    const result = await service.read(2, now);
    expect(result.days).toEqual([
      {
        day: '2026-09-20',
        livenessMinutes: 1,
        expectedMinutes: 1440,
        rows: [],
      },
    ]);
  });

  it('returns no days when the ledger is silent', async () => {
    const result = await service.read(5, now);
    expect(result.days).toEqual([]);
    expect(result.from).toBe('2026-09-17');
  });

  it('skips malformed fields', async () => {
    store['msg:proxy:usage:2026-09-21'] = { garbage: '1', 'a|b|c|d|1': 'NaN' };
    const result = await service.read(1, now);
    expect(result.days[0].rows).toEqual([]);
  });
});
