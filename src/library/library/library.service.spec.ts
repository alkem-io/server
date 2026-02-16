import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { Library } from './library.entity';
import { LibraryService } from './library.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('LibraryService', () => {
  let service: LibraryService;
  let innovationPackService: InnovationPackService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LibraryService);
    innovationPackService = module.get(InnovationPackService);
    db = module.get(DRIZZLE);
  });

  // ── getLibraryOrFail ──────────────────────────────────────────────

  describe('getLibraryOrFail', () => {
    it('should return the library when found', async () => {
      const library = { id: 'lib-1' } as Library;
      db.query.libraries.findFirst.mockResolvedValueOnce(library);

      const result = await service.getLibraryOrFail();

      expect(result).toBe(library);
    });

    it('should pass through FindOneOptions when provided', async () => {
      const library = { id: 'lib-1' } as Library;
      db.query.libraries.findFirst.mockResolvedValueOnce(library);

      await service.getLibraryOrFail({
        relations: { authorization: true },
      });

    });

    it('should throw EntityNotFoundException when library is not found', async () => {

      await expect(service.getLibraryOrFail()).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── save ──────────────────────────────────────────────────────────
  // ── getListedVirtualContributors ──────────────────────────────────
  // ── getListedInnovationHubs ───────────────────────────────────────
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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

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
      db.query.innovationPacks.findMany.mockResolvedValueOnce(packs);

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toHaveLength(2);
      // Template with no profile (empty displayName) sorts before 'Beta'
      expect(result[0].template.id).toBe('tpl-no-profile');
      expect(result[1].template.profile?.displayName).toBe('Beta');
    });

    it('should return empty array when no innovation packs exist', async () => {

      const result = await service.getTemplatesInListedInnovationPacks();

      expect(result).toEqual([]);
    });
  });
});
