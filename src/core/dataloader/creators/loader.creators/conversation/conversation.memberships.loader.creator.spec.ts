import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ConversationMembershipsLoaderCreator } from './conversation.memberships.loader.creator';

describe('ConversationMembershipsLoaderCreator', () => {
  let creator: ConversationMembershipsLoaderCreator;
  let mockEntityManager: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockEntityManager = {
      find: vi.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationMembershipsLoaderCreator,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken(),
          useValue: mockEntityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    creator = module.get(ConversationMembershipsLoaderCreator);
  });

  it('should be defined', () => {
    expect(creator).toBeDefined();
  });

  it('creates a DataLoader', () => {
    const loader = creator.create();
    expect(loader).toBeDefined();
    expect(typeof loader.load).toBe('function');
  });

  it('returns empty arrays for conversations with no memberships', async () => {
    mockEntityManager.find.mockResolvedValue([]);

    const loader = creator.create();
    const result = await loader.load('conv-1');

    expect(result).toEqual([]);
  });

  it('batches and groups memberships by conversation ID', async () => {
    const memberships = [
      { conversationId: 'conv-1', actorID: 'actor-1' },
      { conversationId: 'conv-1', actorID: 'actor-2' },
      { conversationId: 'conv-2', actorID: 'actor-3' },
    ];

    const actors = [
      { id: 'actor-1', type: 'USER' },
      { id: 'actor-2', type: 'VIRTUAL_CONTRIBUTOR' },
      { id: 'actor-3', type: 'USER' },
    ];

    // First call for memberships, second for actors
    mockEntityManager.find
      .mockResolvedValueOnce(memberships)
      .mockResolvedValueOnce(actors);

    const loader = creator.create();

    // Load multiple conversations
    const [result1, result2] = await Promise.all([
      loader.load('conv-1'),
      loader.load('conv-2'),
    ]);

    expect(result1).toHaveLength(2);
    expect(result1[0].actorType).toBe('USER');
    expect(result1[1].actorType).toBe('VIRTUAL_CONTRIBUTOR');
    expect(result2).toHaveLength(1);
    expect(result2[0].actorType).toBe('USER');
  });

  it('handles empty conversation IDs batch', async () => {
    // Access the private method via the loader
    mockEntityManager.find.mockResolvedValue([]);

    const loader = creator.create();
    // DataLoader will batch; for a single empty load it returns []
    const result = await loader.load('conv-nonexistent');
    expect(result).toEqual([]);
  });
});
