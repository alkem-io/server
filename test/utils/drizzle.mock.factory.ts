import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { vi } from 'vitest';

/**
 * Creates a mock Drizzle database instance for unit tests.
 * Replaces repositoryMockFactory and MockEntityManagerProvider.
 *
 * All chainable methods return `this` for fluent API mocking.
 * The `query` property provides table-specific relational query mocks.
 */
export const createMockDrizzle = () => {
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    fullJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(async (fn: (tx: any) => Promise<any>) =>
      fn(createMockDrizzle())
    ),
    query: new Proxy(
      {} as Record<string, any>,
      {
        get: (target, prop) => {
          if (typeof prop === 'string' && !(prop in target)) {
            target[prop] = {
              findFirst: vi.fn().mockResolvedValue(undefined),
              findMany: vi.fn().mockResolvedValue([]),
            };
          }
          return target[prop as string];
        },
      }
    ),
  };

  return mock;
};

/**
 * NestJS provider for injecting a mock Drizzle instance in tests.
 *
 * Usage in test module:
 * ```
 * providers: [
 *   mockDrizzleProvider,
 *   MyService,
 * ]
 * ```
 */
export const mockDrizzleProvider = {
  provide: DRIZZLE,
  useFactory: createMockDrizzle,
};
