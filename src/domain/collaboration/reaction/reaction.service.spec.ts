import { ReactionType } from '@common/enums/reaction.type';
import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { Reaction } from './reaction.entity';
import { ReactionService } from './reaction.service';

function makeQueryBuilder(rawResult: unknown[]) {
  const qb = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rawResult),
    insert: vi.fn().mockReturnThis(),
    into: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    orUpdate: vi.fn().mockReturnThis(),
    setParameter: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return qb;
}

describe('ReactionService', () => {
  let service: ReactionService;
  let repo: Mocked<Repository<Reaction>>;

  beforeEach(async () => {
    const mockRepo = {
      createQueryBuilder: vi.fn(),
      findOneOrFail: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn().mockResolvedValue({ affected: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        {
          provide: getRepositoryToken(Reaction),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get(ReactionService);
    repo = module.get(getRepositoryToken(Reaction)) as Mocked<
      Repository<Reaction>
    >;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── allow-list validation ──────────────────────────────────────────────────

  describe('validateAllowedEmojiOrFail', () => {
    it('accepts all 7 allowed slugs', () => {
      const slugs = [
        'heart',
        'hugging-face',
        'clapping-hands',
        'light-bulb',
        'bullseye',
        'check-mark',
        'rocket',
      ];
      for (const slug of slugs) {
        expect(() => service.validateAllowedEmojiOrFail(slug)).not.toThrow();
      }
    });

    it.each([
      '1',
      '#',
      '*',
      '😀',
      'smiley',
      '',
    ])('rejects %s (not on the allow-list)', value => {
      expect(() => service.validateAllowedEmojiOrFail(value)).toThrow(
        ValidationException
      );
    });
  });

  // ── upsert ─────────────────────────────────────────────────────────────────

  describe('upsertReaction', () => {
    it('executes a single INSERT … ON CONFLICT DO UPDATE and returns the record', async () => {
      const qb = makeQueryBuilder([]);
      repo.createQueryBuilder.mockReturnValue(qb as any);
      const now = new Date();
      const existingReaction = {
        id: 'r1',
        type: ReactionType.POST,
        entityID: 'e1',
        createdBy: 'u1',
        emoji: 'heart',
        // Same dates (within 1ms) signals a genuine INSERT
        updatedDate: now,
        createdDate: now,
      } as Reaction;
      repo.findOneOrFail.mockResolvedValue(existingReaction);

      const result = await service.upsertReaction(
        ReactionType.POST,
        'e1',
        'u1',
        'heart'
      );

      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result.reaction.emoji).toBe('heart');
      expect(result.created).toBe(true);
    });

    it('swap: a second upsert with a different emoji hits the same code path without inserting a second row', async () => {
      const qb = makeQueryBuilder([]);
      repo.createQueryBuilder.mockReturnValue(qb as any);
      const now = new Date();
      const olderDate = new Date(now.getTime() - 5000);
      const updatedReaction = {
        id: 'r1',
        type: ReactionType.POST,
        entityID: 'e1',
        createdBy: 'u1',
        emoji: 'rocket',
        // Different dates signal this was an ON CONFLICT update (swap), not an insert
        updatedDate: now,
        createdDate: olderDate,
      } as Reaction;
      repo.findOneOrFail.mockResolvedValue(updatedReaction);

      const result = await service.upsertReaction(
        ReactionType.POST,
        'e1',
        'u1',
        'rocket'
      );

      // The upsert ran once and the returned emoji reflects the new choice.
      // Swap is signaled by created:false (dates differ > 1ms).
      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result.reaction.emoji).toBe('rocket');
      expect(result.created).toBe(false);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('removeReaction', () => {
    it('calls delete with the correct conditions', async () => {
      await service.removeReaction(ReactionType.POST, 'e1', 'u1');
      expect(repo.delete).toHaveBeenCalledWith({
        type: ReactionType.POST,
        entityID: 'e1',
        createdBy: 'u1',
      });
    });

    it('does NOT throw when there is no matching row (zero affected rows)', async () => {
      repo.delete.mockResolvedValue({ affected: 0 } as any);
      await expect(
        service.removeReaction(ReactionType.POST, 'e1', 'u1')
      ).resolves.toBeUndefined();
    });
  });

  // ── tier-1 summary ─────────────────────────────────────────────────────────

  describe('getSummaryForEntities', () => {
    it('issues a single GROUP BY query for multiple entity IDs', async () => {
      const qb = makeQueryBuilder([
        { entityID: 'e1', total: '3', emojis: ['heart', 'rocket'] },
        { entityID: 'e2', total: '1', emojis: ['heart'] },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb as any);

      const results = await service.getSummaryForEntities(ReactionType.POST, [
        'e1',
        'e2',
        'e3',
      ]);

      expect(qb.groupBy).toHaveBeenCalledWith('r.entityID');
      expect(results).toHaveLength(2);
      const e1 = results.find(r => r.entityID === 'e1');
      expect(e1?.total).toBe(3);
      // e3 has no reactions → not in results (caller defaults to 0)
      expect(results.find(r => r.entityID === 'e3')).toBeUndefined();
    });

    it('returns emojis in allow-list order', async () => {
      const qb = makeQueryBuilder([
        { entityID: 'e1', total: '2', emojis: ['rocket', 'heart'] },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb as any);

      const results = await service.getSummaryForEntities(ReactionType.POST, [
        'e1',
      ]);
      expect(results[0].emojis).toEqual(['heart', 'rocket']);
    });

    it('returns an empty array when given no entity IDs', async () => {
      const results = await service.getSummaryForEntities(
        ReactionType.POST,
        []
      );
      expect(results).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ── tier-2 detail ─────────────────────────────────────────────────────────

  describe('getReactionsForEntity', () => {
    it('queries with ORDER BY updatedDate DESC and LIMIT 100', async () => {
      repo.find.mockResolvedValue([]);

      await service.getReactionsForEntity(ReactionType.POST, 'e1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { updatedDate: 'DESC' },
          take: 100,
        })
      );
    });

    it('respects a custom cap', async () => {
      repo.find.mockResolvedValue([]);

      await service.getReactionsForEntity(ReactionType.POST, 'e1', 5);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  // ── deleteAllForEntity ────────────────────────────────────────────────────

  describe('deleteAllForEntity', () => {
    it('deletes with the correct type + entityID conditions', async () => {
      await service.deleteAllForEntity(ReactionType.POST, 'e1');
      expect(repo.delete).toHaveBeenCalledWith({
        type: ReactionType.POST,
        entityID: 'e1',
      });
    });

    it('uses the provided transaction manager repository when one is passed', async () => {
      const managerRepo = {
        delete: vi.fn().mockResolvedValue({ affected: 0 }),
      };
      const manager = {
        getRepository: vi.fn().mockReturnValue(managerRepo),
      } as any;

      await service.deleteAllForEntity(ReactionType.POST, 'e1', manager);

      // The delete is issued through the manager's repository, not the
      // service's own repository — so it enrolls in the caller's transaction.
      expect(manager.getRepository).toHaveBeenCalledWith(Reaction);
      expect(managerRepo.delete).toHaveBeenCalledWith({
        type: ReactionType.POST,
        entityID: 'e1',
      });
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
