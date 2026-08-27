import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { TemplateType } from '@common/enums/template.type';
import { ValidationException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken, getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { Template } from './template.entity';
import { TemplateService } from './template.service';

describe('TemplateService — Classification Template (FR-002, I-9)', () => {
  let service: TemplateService;
  let templateRepository: Mocked<Repository<Template>>;
  let profileService: Mocked<ProfileService>;

  const storageAggregator = {} as any;
  const actorContext = { actorID: 'actor-1' } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(Template, 'create').mockImplementation((input: any) => {
      const entity = new Template();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        repositoryProviderMockFactory(Template),
        repositoryProviderMockFactory(InnovationPack),
        {
          provide: getEntityManagerToken('default'),
          useValue: { find: vi.fn(), findOne: vi.fn() },
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateService);
    templateRepository = module.get(getRepositoryToken(Template)) as Mocked<
      Repository<Template>
    >;
    profileService = module.get(ProfileService) as Mocked<ProfileService>;

    profileService.createProfile.mockResolvedValue({ id: 'profile-1' } as any);
    profileService.addOrUpdateTagsetOnProfile.mockResolvedValue({} as any);
    templateRepository.save.mockImplementation(async (entity: any) => entity);
  });

  const classificationInput = (overrides: Record<string, any> = {}) => ({
    type: TemplateType.CLASSIFICATION,
    profileData: { displayName: 'SDGs', visuals: [] },
    classificationData: {
      cardinality: ClassificationCardinality.MULTI_SELECT,
      values: [{ label: 'Climate Action' }, { label: 'Life Below Water' }],
    },
    ...overrides,
  });

  describe('create — derivation from labels only (US2-AS2)', () => {
    it('derives a slugified id for each value that omits one', async () => {
      const result = await service.createTemplate(
        classificationInput() as any,
        storageAggregator,
        actorContext
      );

      expect(result.classificationValueSet).toEqual([
        { id: 'climate-action', label: 'Climate Action' },
        { id: 'life-below-water', label: 'Life Below Water' },
      ]);
      expect(result.classificationCardinality).toEqual(
        ClassificationCardinality.MULTI_SELECT
      );
    });

    it('suffixes deterministically on a derived-id collision', async () => {
      const result = await service.createTemplate(
        classificationInput({
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ label: 'Dutch' }, { label: 'Dutch' }],
          },
        }) as any,
        storageAggregator,
        actorContext
      );

      expect(result.classificationValueSet?.map((v: any) => v.id)).toEqual([
        'dutch',
        'dutch-2',
      ]);
    });
  });

  describe('create — explicit override (US2-AS3)', () => {
    it('rejects a colliding explicit id override, never silently suffixing', async () => {
      await expect(
        service.createTemplate(
          classificationInput({
            classificationData: {
              cardinality: ClassificationCardinality.MULTI_SELECT,
              values: [
                { id: 'dutch', label: 'Dutch' },
                { id: 'dutch', label: 'Nederlands' },
              ],
            },
          }) as any,
          storageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('the 1–50 bound (FR-002a)', () => {
    it('rejects zero values', async () => {
      await expect(
        service.createTemplate(
          classificationInput({
            classificationData: {
              cardinality: ClassificationCardinality.MULTI_SELECT,
              values: [],
            },
          }) as any,
          storageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });

    it('rejects 51 values', async () => {
      const values = Array.from({ length: 51 }, (_, i) => ({
        label: `Value ${i}`,
      }));
      await expect(
        service.createTemplate(
          classificationInput({
            classificationData: {
              cardinality: ClassificationCardinality.MULTI_SELECT,
              values,
            },
          }) as any,
          storageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('I-9: a CLASSIFICATION template is never half-built', () => {
    it('rejects create with type CLASSIFICATION and no classificationData', async () => {
      await expect(
        service.createTemplate(
          classificationInput({ classificationData: undefined }) as any,
          storageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });

    it('rejects classificationData supplied with any other TemplateType', async () => {
      await expect(
        service.createTemplate(
          {
            type: TemplateType.POST,
            profileData: { displayName: 'Post', visuals: [] },
            postDefaultDescription: 'desc',
            classificationData: {
              cardinality: ClassificationCardinality.MULTI_SELECT,
              values: [{ label: 'A' }],
            },
          } as any,
          storageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('FR-004 / US2-S2: distinct name-ids for same-displayName templates', () => {
    it('two Classification Templates named "Language" get independently-supplied, distinct nameIDs', async () => {
      const a = await service.createTemplate(
        classificationInput({
          nameID: 'language-pack-a',
          profileData: { displayName: 'Language', visuals: [] },
        }) as any,
        storageAggregator,
        actorContext
      );
      const b = await service.createTemplate(
        classificationInput({
          nameID: 'language-pack-b',
          profileData: { displayName: 'Language', visuals: [] },
        }) as any,
        storageAggregator,
        actorContext
      );

      expect(a.nameID).toEqual('language-pack-a');
      expect(b.nameID).toEqual('language-pack-b');
      expect(a.nameID).not.toEqual(b.nameID);
    });
  });

  describe('update — S-11: renaming a value leaves its id unchanged', () => {
    it('keeps the existing id when the caller passes it back on a relabel', async () => {
      const existing = new Template();
      existing.id = 'tmpl-1';
      existing.type = TemplateType.CLASSIFICATION;
      existing.classificationCardinality =
        ClassificationCardinality.MULTI_SELECT;
      existing.classificationValueSet = [{ id: 'dutch', label: 'Dutch' }];
      templateRepository.find.mockResolvedValue([existing]);

      const updated = await service.updateTemplate(
        existing as any,
        {
          ID: 'tmpl-1',
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ id: 'dutch', label: 'Nederlands' }],
          },
        } as any,
        actorContext
      );

      expect(updated.classificationValueSet).toEqual([
        { id: 'dutch', label: 'Nederlands' },
      ]);
    });

    it('keeps the existing id on a relabel even when the caller OMITS the id — derive-once must not depend on the client echoing it back', async () => {
      const existing = new Template();
      existing.id = 'tmpl-1';
      existing.type = TemplateType.CLASSIFICATION;
      existing.classificationCardinality =
        ClassificationCardinality.MULTI_SELECT;
      existing.classificationValueSet = [{ id: 'dutch', label: 'Dutch' }];
      templateRepository.find.mockResolvedValue([existing]);

      const updated = await service.updateTemplate(
        existing as any,
        {
          ID: 'tmpl-1',
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ label: 'Nederlands' }],
          },
        } as any,
        actorContext
      );

      expect(updated.classificationValueSet).toEqual([
        { id: 'dutch', label: 'Nederlands' },
      ]);
    });

    it('derives a fresh id only for a value beyond the previous length, on an id-omitted edit', async () => {
      const existing = new Template();
      existing.id = 'tmpl-1';
      existing.type = TemplateType.CLASSIFICATION;
      existing.classificationCardinality =
        ClassificationCardinality.MULTI_SELECT;
      existing.classificationValueSet = [{ id: 'dutch', label: 'Dutch' }];
      templateRepository.find.mockResolvedValue([existing]);

      const updated = await service.updateTemplate(
        existing as any,
        {
          ID: 'tmpl-1',
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ label: 'Nederlands' }, { label: 'French' }],
          },
        } as any,
        actorContext
      );

      expect(updated.classificationValueSet).toEqual([
        { id: 'dutch', label: 'Nederlands' },
        { id: 'french', label: 'French' },
      ]);
    });

    it('removing the first value with ids omitted keeps the survivor on its own id — never re-pointed via position', async () => {
      const existing = new Template();
      existing.id = 'tmpl-1';
      existing.type = TemplateType.CLASSIFICATION;
      existing.classificationCardinality =
        ClassificationCardinality.MULTI_SELECT;
      existing.classificationValueSet = [
        { id: 'dutch', label: 'Dutch' },
        { id: 'french', label: 'French' },
      ];
      templateRepository.find.mockResolvedValue([existing]);

      const updated = await service.updateTemplate(
        existing as any,
        {
          ID: 'tmpl-1',
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ label: 'French' }],
          },
        } as any,
        actorContext
      );

      expect(updated.classificationValueSet).toEqual([
        { id: 'french', label: 'French' },
      ]);
    });

    it('a reorder with ids omitted leaves every id pointing at its own label, never swapped', async () => {
      const existing = new Template();
      existing.id = 'tmpl-1';
      existing.type = TemplateType.CLASSIFICATION;
      existing.classificationCardinality =
        ClassificationCardinality.MULTI_SELECT;
      existing.classificationValueSet = [
        { id: 'dutch', label: 'Dutch' },
        { id: 'french', label: 'French' },
      ];
      templateRepository.find.mockResolvedValue([existing]);

      const updated = await service.updateTemplate(
        existing as any,
        {
          ID: 'tmpl-1',
          classificationData: {
            cardinality: ClassificationCardinality.MULTI_SELECT,
            values: [{ label: 'French' }, { label: 'Dutch' }],
          },
        } as any,
        actorContext
      );

      expect(updated.classificationValueSet).toEqual([
        { id: 'french', label: 'French' },
        { id: 'dutch', label: 'Dutch' },
      ]);
    });

    it('rejects classificationData on an update targeting a non-CLASSIFICATION template', async () => {
      const existing = new Template();
      existing.id = 'tmpl-2';
      existing.type = TemplateType.POST;
      templateRepository.find.mockResolvedValue([existing]);

      await expect(
        service.updateTemplate(
          existing as any,
          {
            ID: 'tmpl-2',
            classificationData: {
              cardinality: ClassificationCardinality.MULTI_SELECT,
              values: [{ label: 'A' }],
            },
          } as any,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
    });
  });
});
