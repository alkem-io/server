import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { EntityManager, Repository } from 'typeorm';
import { vi } from 'vitest';
import { Library } from './library.entity';
import { LibraryService } from './library.service';

// NOTE: we deliberately do NOT `vi.mock('@core/pagination')`. The suite runs
// with `isolate: false` (shared module registry across files), under which a
// hoisted module-factory mock for the shared pagination barrel is unreliable —
// another spec importing the real module can clobber it, intermittently letting
// the real `getPaginationResults` run and failing with "query.getCount is not a
// function". Instead we feed a deep (self-chaining) QueryBuilder mock and let the
// real helper run against it — the same approach as activity.service.spec.ts.
// The helper's own cursor algorithm is covered by relay.style.pagination.fn.spec.ts.

describe('LibraryService', () => {
  let service: LibraryService;
  let libraryRepository: Repository<Library>;
  let entityManager: EntityManager;
  let innovationPackService: InnovationPackService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        repositoryProviderMockFactory(Library),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: {
            find: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LibraryService);
    libraryRepository = module.get(getRepositoryToken(Library));
    entityManager = module.get(getEntityManagerToken('default'));
    innovationPackService = module.get(InnovationPackService);
  });

  // ── getLibraryOrFail ──────────────────────────────────────────────

  describe('getLibraryOrFail', () => {
    it('should return the library when found', async () => {
      const library = { id: 'lib-1' } as Library;
      (libraryRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        library
      );

      const result = await service.getLibraryOrFail();

      expect(result).toBe(library);
      expect(libraryRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    it('should pass through FindOneOptions when provided', async () => {
      const library = { id: 'lib-1' } as Library;
      (libraryRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        library
      );

      await service.getLibraryOrFail({
        relations: { authorization: true },
      });

      expect(libraryRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          relations: { authorization: true },
        })
      );
    });

    it('should throw EntityNotFoundException when library is not found', async () => {
      (libraryRepository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );

      await expect(service.getLibraryOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── save ──────────────────────────────────────────────────────────

  describe('save', () => {
    it('should delegate to the repository save method', async () => {
      const library = { id: 'lib-1' } as Library;
      (libraryRepository.save as ReturnType<typeof vi.fn>).mockResolvedValue(
        library
      );

      const result = await service.save(library);

      expect(libraryRepository.save).toHaveBeenCalledWith(library);
      expect(result).toBe(library);
    });
  });

  // ── getListedVirtualContributors ──────────────────────────────────

  describe('getListedVirtualContributors', () => {
    it('should query entityManager with listedInStore and PUBLIC visibility filters', async () => {
      const vcs = [{ id: 'vc-1' }, { id: 'vc-2' }];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(vcs);

      const result = await service.getListedVirtualContributors();

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            listedInStore: true,
            searchVisibility: 'public',
          },
        })
      );
      expect(result).toEqual(vcs);
    });
  });

  // ── getListedInnovationHubs ───────────────────────────────────────

  describe('getListedInnovationHubs', () => {
    it('should query entityManager with listedInStore and PUBLIC visibility filters', async () => {
      const hubs = [{ id: 'hub-1' }];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(hubs);

      const result = await service.getListedInnovationHubs();

      expect(entityManager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            listedInStore: true,
            searchVisibility: 'public',
          },
        })
      );
      expect(result).toEqual(hubs);
    });
  });

  // ── sortAndFilterInnovationPacks ──────────────────────────────────

  describe('sortAndFilterInnovationPacks', () => {
    const makePack = (id: string): IInnovationPack =>
      ({
        id,
        listedInStore: true,
        searchVisibility: 'public',
        templatesCount: 0,
      }) as unknown as IInnovationPack;

    it('should sort packs by templates count descending (NUMBER_OF_TEMPLATES_DESC)', async () => {
      const packs = [makePack('a'), makePack('b'), makePack('c')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(2) // pack a
        .mockResolvedValueOnce(5) // pack b
        .mockResolvedValueOnce(1); // pack c

      const result = await service.sortAndFilterInnovationPacks(
        packs,
        undefined,
        InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
      );

      expect(result[0]).toEqual(expect.objectContaining({ id: 'b' }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 'a' }));
      expect(result[2]).toEqual(expect.objectContaining({ id: 'c' }));
    });

    it('should sort packs by templates count ascending (NUMBER_OF_TEMPLATES_ASC)', async () => {
      const packs = [makePack('a'), makePack('b'), makePack('c')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(3) // pack a
        .mockResolvedValueOnce(1) // pack b
        .mockResolvedValueOnce(7); // pack c

      const result = await service.sortAndFilterInnovationPacks(
        packs,
        undefined,
        InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_ASC
      );

      expect(result[0]).toEqual(expect.objectContaining({ id: 'b' }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 'a' }));
      expect(result[2]).toEqual(expect.objectContaining({ id: 'c' }));
    });

    it('should return packs with RANDOM order without throwing', async () => {
      const packs = [makePack('a'), makePack('b')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      const result = await service.sortAndFilterInnovationPacks(
        packs,
        undefined,
        InnovationPacksOrderBy.RANDOM
      );

      expect(result).toHaveLength(2);
    });

    it('should apply limit when provided', async () => {
      const packs = [makePack('a'), makePack('b'), makePack('c')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);

      const result = await service.sortAndFilterInnovationPacks(
        packs,
        2,
        InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'a' }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 'b' }));
    });

    it('should return all packs when limit is undefined', async () => {
      const packs = [makePack('a'), makePack('b'), makePack('c')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);

      const result = await service.sortAndFilterInnovationPacks(packs);

      expect(result).toHaveLength(3);
    });

    it('should return all packs when limit is 0', async () => {
      const packs = [makePack('a'), makePack('b')];
      vi.mocked(innovationPackService.getTemplatesCount)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      const result = await service.sortAndFilterInnovationPacks(packs, 0);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when given no packs', async () => {
      const result = await service.sortAndFilterInnovationPacks([]);

      expect(result).toEqual([]);
    });
  });

  // ── getTemplatesInListedInnovationPacks ───────────────────────────

  describe('getTemplatesInListedInnovationPacks', () => {
    const makeTemplate = (
      displayName: string,
      type: TemplateType = TemplateType.POST
    ) => ({
      id: `tpl-${displayName}`,
      type,
      profile: { displayName },
    });

    const makePackWithTemplates = (
      id: string,
      templates: ReturnType<typeof makeTemplate>[]
    ) => ({
      id,
      listedInStore: true,
      searchVisibility: 'public',
      templatesSet: {
        templates,
      },
    });

    it('should return all templates sorted alphabetically when no filter is applied', async () => {
      const packs = [
        makePackWithTemplates('pack-1', [
          makeTemplate('Zebra'),
          makeTemplate('Alpha'),
        ]),
        makePackWithTemplates('pack-2', [makeTemplate('Middle')]),
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toHaveLength(3);
      expect(result[0].template.profile?.displayName).toBe('Alpha');
      expect(result[1].template.profile?.displayName).toBe('Middle');
      expect(result[2].template.profile?.displayName).toBe('Zebra');
    });

    it('should filter templates by type when filter.types is provided', async () => {
      const packs = [
        makePackWithTemplates('pack-1', [
          makeTemplate('Post Template', TemplateType.POST),
          makeTemplate('Whiteboard Template', TemplateType.WHITEBOARD),
          makeTemplate('Another Post', TemplateType.POST),
        ]),
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      const result = await service.getTemplatesInListedInnovationPacks({
        types: [TemplateType.POST],
      });

      expect(result).toHaveLength(2);
      expect(result[0].template.profile?.displayName).toBe('Another Post');
      expect(result[1].template.profile?.displayName).toBe('Post Template');
    });

    it('should include the innovationPack reference in each result', async () => {
      const packs = [
        makePackWithTemplates('pack-1', [makeTemplate('Template A')]),
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toHaveLength(1);
      expect(result[0].innovationPack).toEqual(
        expect.objectContaining({ id: 'pack-1' })
      );
    });

    it('should throw RelationshipNotFoundException when templatesSet is missing', async () => {
      const packs = [
        {
          id: 'pack-bad',
          listedInStore: true,
          searchVisibility: 'public',
          templatesSet: undefined,
        },
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      await expect(
        service.getTemplatesInListedInnovationPacks()
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when templates array is missing', async () => {
      const packs = [
        {
          id: 'pack-bad-2',
          listedInStore: true,
          searchVisibility: 'public',
          templatesSet: { templates: undefined },
        },
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      await expect(
        service.getTemplatesInListedInnovationPacks()
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should sort templates with missing profiles using empty string for displayName', async () => {
      const packs = [
        makePackWithTemplates('pack-1', [makeTemplate('Beta')]),
        {
          id: 'pack-2',
          listedInStore: true,
          searchVisibility: 'public',
          templatesSet: {
            templates: [
              {
                id: 'tpl-no-profile',
                type: TemplateType.POST,
                profile: undefined,
              },
            ],
          },
        },
      ];
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toHaveLength(2);
      // Template with no profile (empty displayName) sorts before 'Beta'
      expect(result[0].template.id).toBe('tpl-no-profile');
      expect(result[1].template.profile?.displayName).toBe('Beta');
    });

    it('should return empty array when no innovation packs exist', async () => {
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toEqual([]);
    });
  });

  // A self-chaining QueryBuilder mock complete enough for the REAL
  // getPaginationResults / getRelayStylePaginationResults helper to run against
  // (getCount + getMany + the chained builder methods it touches). `items` is
  // what a page returns; `count` is the total. No cursor (before/after) is used
  // by these tests, so getOne is never hit.
  const makeQb = (
    alias: string,
    { items = [] as any[], count = 0 } = {}
  ): Record<string, any> => {
    const qb: Record<string, any> = {};
    for (const method of [
      'where',
      'andWhere',
      'innerJoin',
      'innerJoinAndSelect',
      'leftJoin',
      'leftJoinAndSelect',
      'orderBy',
      'addOrderBy',
      'take',
      'clone',
    ]) {
      qb[method] = vi.fn(() => qb);
    }
    qb.alias = alias;
    qb.expressionMap = { orderBys: {}, wheres: [] };
    qb.getCount = vi.fn().mockResolvedValue(count);
    qb.getMany = vi.fn().mockResolvedValue(items);
    qb.getOne = vi.fn().mockResolvedValue(undefined);
    return qb;
  };

  // The searchTerm filter is added via `qb.andWhere(new Brackets(cb))`. This
  // finds that Brackets among the andWhere calls and runs its callback against a
  // fake where-expression builder, returning the builder so tests can assert the
  // exact predicate fragments (displayName/description ILIKE + tags EXISTS).
  const runSearchBracket = (qb: Record<string, any>) => {
    const bracket = qb.andWhere.mock.calls
      .map((c: any[]) => c[0])
      .find((arg: any) => arg && typeof arg.whereFactory === 'function');
    if (!bracket) {
      return undefined;
    }
    const wqb: Record<string, any> = {};
    wqb.where = vi.fn(() => wqb);
    wqb.orWhere = vi.fn(() => wqb);
    bracket.whereFactory(wqb);
    return wqb;
  };

  // ── getPaginatedListedInnovationPacks ─────────────────────────────
  describe('getPaginatedListedInnovationPacks', () => {
    it('should page newest-first (rowId DESC) and return the helper result', async () => {
      const items = [
        { id: 'pack-a', rowId: 2 },
        { id: 'pack-b', rowId: 1 },
      ];
      const qb = makeQb('innovationPack', { items, count: 2 });
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      const result = await service.getPaginatedListedInnovationPacks({
        first: 10,
      });

      expect(result.total).toBe(2);
      expect(result.items).toEqual(items);
      // newest-first: rowId DESC on the query alias
      expect(qb.orderBy).toHaveBeenCalledWith({
        'innovationPack.rowId': 'DESC',
      });
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should clamp a page size above the maximum to 100', async () => {
      const qb = makeQb('innovationPack');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedListedInnovationPacks({ first: 500 });

      // clamp happens before the helper, so the helper limits the page to 100
      expect(qb.take).toHaveBeenCalledWith(100);
    });

    // Regression: the guarded InnovationPack.templatesSet child field reads the
    // pack's authorization policy, so the paginated query MUST load it or
    // resolving templatesSet throws "Authorization: no definition provided".
    it('should load the authorization relation so guarded child fields resolve', async () => {
      const qb = makeQb('innovationPack');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedListedInnovationPacks({ first: 10 });

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'innovationPack.authorization',
        'authorization_policy'
      );
    });

    it('should filter by searchTerm over title, description and tags', async () => {
      const qb = makeQb('innovationPack');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedListedInnovationPacks(
        { first: 25 },
        { searchTerm: 'inno' }
      );

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'innovationPack.profile',
        'searchProfile'
      );
      const wqb = runSearchBracket(qb);
      expect(wqb?.where).toHaveBeenCalledWith(
        'searchProfile.displayName ILIKE :searchTerm',
        { searchTerm: '%inno%' }
      );
      expect(wqb?.orWhere).toHaveBeenCalledWith(
        'searchProfile.description ILIKE :searchTerm',
        { searchTerm: '%inno%' }
      );
      expect(wqb?.orWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS (SELECT 1 FROM tagset'),
        { searchTerm: '%inno%' }
      );
    });

    it('should treat a blank searchTerm as no filter', async () => {
      const qb = makeQb('innovationPack');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedListedInnovationPacks(
        { first: 25 },
        { searchTerm: '   ' }
      );

      expect(qb.leftJoin).not.toHaveBeenCalled();
    });
  });

  // ── getPaginatedTemplates ─────────────────────────────────────────
  describe('getPaginatedTemplates', () => {
    it('should pair each paginated template with its contributing pack', async () => {
      const template = { id: 't1', rowId: 1, templatesSet: { id: 'ts1' } };
      const pack = { id: 'p1', templatesSet: { id: 'ts1' } };
      const qb = makeQb('template', { items: [template], count: 1 });
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue([
        pack,
      ]);

      const result = await service.getPaginatedTemplates({ first: 25 });

      expect(result.total).toBe(1);
      expect(result.items).toEqual([{ template, innovationPack: pack }]);
      expect(qb.orderBy).toHaveBeenCalledWith({ 'template.rowId': 'DESC' });
    });

    // Regression: the paired InnovationPack's guarded templatesSet child field
    // reads its authorization policy, so the pack lookup MUST load it.
    it('should load the authorization relation when pairing templates with packs', async () => {
      const template = { id: 't1', rowId: 1, templatesSet: { id: 'ts1' } };
      const pack = { id: 'p1', templatesSet: { id: 'ts1' } };
      const qb = makeQb('template', { items: [template], count: 1 });
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue([
        pack,
      ]);

      await service.getPaginatedTemplates({ first: 25 });

      expect(entityManager.find).toHaveBeenCalledWith(
        InnovationPack,
        expect.objectContaining({
          relations: expect.objectContaining({ authorization: true }),
        })
      );
    });

    it('should apply the template-type filter when provided', async () => {
      const qb = makeQb('template');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedTemplates(
        { first: 25 },
        { types: [TemplateType.CALLOUT] }
      );

      expect(qb.andWhere).toHaveBeenCalledWith('template.type IN (:...types)', {
        types: [TemplateType.CALLOUT],
      });
    });

    it('should filter by searchTerm over the template title, description and tags', async () => {
      const qb = makeQb('template');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedTemplates(
        { first: 25 },
        { searchTerm: 'inno' }
      );

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'template.profile',
        'searchProfile'
      );
      const wqb = runSearchBracket(qb);
      expect(wqb?.where).toHaveBeenCalledWith(
        'searchProfile.displayName ILIKE :searchTerm',
        { searchTerm: '%inno%' }
      );
      expect(wqb?.orWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS (SELECT 1 FROM tagset'),
        { searchTerm: '%inno%' }
      );
    });

    it('should compose the type filter (AND) with the searchTerm filter', async () => {
      const qb = makeQb('template');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedTemplates(
        { first: 25 },
        { types: [TemplateType.CALLOUT], searchTerm: 'inno' }
      );

      // type filter still applied...
      expect(qb.andWhere).toHaveBeenCalledWith('template.type IN (:...types)', {
        types: [TemplateType.CALLOUT],
      });
      // ...and the search OR-group joined the profile too
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'template.profile',
        'searchProfile'
      );
      expect(runSearchBracket(qb)).toBeDefined();
    });

    it('should treat a blank searchTerm as no filter', async () => {
      const qb = makeQb('template');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedTemplates({ first: 25 }, { searchTerm: '  ' });

      expect(qb.leftJoin).not.toHaveBeenCalled();
    });

    it('should clamp the page size above the maximum to 100', async () => {
      const qb = makeQb('template');
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      await service.getPaginatedTemplates({ first: 250 });

      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('should return an empty page without loading packs when no templates match', async () => {
      const qb = makeQb('template', { items: [], count: 0 });
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);

      const result = await service.getPaginatedTemplates({ first: 25 });

      expect(result.items).toEqual([]);
      expect(entityManager.find).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when a template has no listed pack', async () => {
      const template = {
        id: 't1',
        rowId: 1,
        templatesSet: { id: 'ts-orphan' },
      };
      const qb = makeQb('template', { items: [template], count: 1 });
      (entityManager as any).createQueryBuilder = vi.fn(() => qb);
      (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        service.getPaginatedTemplates({ first: 25 })
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
