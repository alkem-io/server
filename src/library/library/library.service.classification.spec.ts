/**
 * FR-005b/FR-007b/research D-10: `library.templates(filter: { types:
 * [CLASSIFICATION] })` already answers the picker's platform half — no new
 * query surface is built for this feature, only the new TemplateType
 * enum value and its filter support (already generic over TemplateType).
 */
import { TemplateType } from '@common/enums/template.type';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { EntityManager } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Library } from './library.entity';
import { LibraryService } from './library.service';

describe('LibraryService — Classification Templates (FR-005b, FR-007b)', () => {
  let service: LibraryService;
  let entityManager: EntityManager;

  const makeTemplate = (displayName: string, description: string) => ({
    id: `tpl-${displayName}`,
    type: TemplateType.CLASSIFICATION,
    profile: { displayName, description },
  });

  const makePack = (id: string, templates: any[]) => ({
    id,
    listedInStore: true,
    searchVisibility: 'public',
    templatesSet: { templates },
  });

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
          useValue: { find: vi.fn() },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(LibraryService);
    entityManager = module.get(getEntityManagerToken('default'));
  });

  it('resolves Classification Templates from every listed pack, with profile.description loaded', async () => {
    const packs = [
      makePack('pack-1', [
        makeTemplate('SDGs', 'The UN Sustainable Development Goals.'),
      ]),
      makePack('pack-2', [
        makeTemplate('Sector', 'The primary sector this Space operates in.'),
      ]),
    ];
    (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

    const result = await service.getTemplatesInListedInnovationPacks({
      types: [TemplateType.CLASSIFICATION],
    });

    expect(result).toHaveLength(2);
    expect(
      result.every(r => r.template.type === TemplateType.CLASSIFICATION)
    ).toBe(true);
    expect(result.map(r => r.template.profile?.description)).toEqual(
      expect.arrayContaining([
        'The UN Sustainable Development Goals.',
        'The primary sector this Space operates in.',
      ])
    );
  });

  it('excludes non-Classification templates when the filter is applied', async () => {
    const packs = [
      makePack('pack-1', [
        makeTemplate('SDGs', 'desc'),
        {
          id: 'tpl-post',
          type: TemplateType.POST,
          profile: { displayName: 'Post' },
        },
      ]),
    ];
    (entityManager.find as ReturnType<typeof vi.fn>).mockResolvedValue(packs);

    const result = await service.getTemplatesInListedInnovationPacks({
      types: [TemplateType.CLASSIFICATION],
    });

    expect(result).toHaveLength(1);
    expect(result[0].template.profile?.displayName).toBe('SDGs');
  });
});
