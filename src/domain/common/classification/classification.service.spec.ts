import { TagsetType } from '@common/enums/tagset.type';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { CreateTagsetInput } from '../tagset/dto/tagset.dto.create';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { Classification } from './classification.entity';
import { IClassification } from './classification.interface';
import { ClassificationService } from './classification.service';

describe('ClassificationService', () => {
  let service: ClassificationService;
  let tagsetService: TagsetService;

  beforeEach(async () => {
    // Mock static Classification.create to avoid DataSource requirement
    vi.spyOn(Classification, 'create').mockImplementation((input: any) => {
      const entity = new Classification();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassificationService,
        repositoryProviderMockFactory(Classification),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ClassificationService);
    tagsetService = module.get(TagsetService);
  });

  describe('createClassification', () => {
    it('should create a classification with tagsets from templates', () => {
      const templates: ITagsetTemplate[] = [
        {
          id: 'tt-1',
          name: 'skills',
          type: TagsetType.SELECT_MANY,
          allowedValues: ['ts', 'js'],
        } as ITagsetTemplate,
      ];

      (
        tagsetService.convertTagsetTemplatesToCreateTagsetInput as Mock
      ).mockReturnValue([
        { name: 'skills', type: TagsetType.SELECT_MANY, tags: [] },
      ]);
      (tagsetService.createTagsetWithName as Mock).mockReturnValue({
        id: 'ts-1',
        name: 'skills',
        tags: [],
        type: TagsetType.SELECT_MANY,
      } as any);

      const result = service.createClassification(templates);

      expect(result.authorization).toBeDefined();
      expect(result.tagsets).toHaveLength(1);
    });

    it('should merge provided classification data tags with template defaults', () => {
      const templates: ITagsetTemplate[] = [
        {
          id: 'tt-1',
          name: 'skills',
          type: TagsetType.SELECT_MANY,
          allowedValues: ['ts', 'js'],
        } as ITagsetTemplate,
      ];

      (
        tagsetService.convertTagsetTemplatesToCreateTagsetInput as Mock
      ).mockReturnValue([
        { name: 'skills', type: TagsetType.SELECT_MANY, tags: [] },
      ]);
      (
        tagsetService.updatedTagsetInputUsingProvidedData as Mock
      ).mockReturnValue([
        { name: 'skills', type: TagsetType.SELECT_MANY, tags: ['ts'] },
      ]);
      (tagsetService.createTagsetWithName as Mock).mockReturnValue({
        id: 'ts-1',
        name: 'skills',
        tags: ['ts'],
        type: TagsetType.SELECT_MANY,
      } as any);

      const result = service.createClassification(templates, {
        tagsets: [
          { name: 'skills', tags: ['ts'], type: TagsetType.SELECT_MANY },
        ],
      });

      expect(
        tagsetService.updatedTagsetInputUsingProvidedData
      ).toHaveBeenCalled();
      expect(result.tagsets![0].tags).toEqual(['ts']);
    });
  });

  describe('updateClassification', () => {
    it('should update tagsets when update data contains tagsets', () => {
      const classification = {
        id: 'cls-1',
        tagsets: [{ id: 'ts-1', name: 'skills', tags: ['old'] }],
      } as unknown as IClassification;

      (tagsetService.updateTagsets as Mock).mockReturnValue([
        { id: 'ts-1', name: 'skills', tags: ['new'] },
      ] as any);

      const result = service.updateClassification(classification, {
        tagsets: [{ ID: 'ts-1', tags: ['new'] }],
      });

      expect(tagsetService.updateTagsets).toHaveBeenCalled();
      expect(result.tagsets![0].tags).toEqual(['new']);
    });

    it('should not modify classification when no tagsets in update data', () => {
      const classification = {
        id: 'cls-1',
        tagsets: [{ id: 'ts-1', name: 'skills', tags: ['keep'] }],
      } as unknown as IClassification;

      const result = service.updateClassification(classification, {});

      expect(result.tagsets![0].tags).toEqual(['keep']);
    });
  });

  describe('updateClassificationTagsetInputs', () => {
    it('should return additional inputs when tagsetInputData is undefined', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'default', tags: [], type: TagsetType.FREEFORM },
      ];

      const result = service.updateClassificationTagsetInputs(
        undefined,
        additional
      );

      expect(result).toEqual(additional);
    });

    it('should override tags in matching inputs', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: ['default-tag'], type: TagsetType.FREEFORM },
      ];
      const provided: CreateTagsetInput[] = [
        { name: 'skills', tags: ['custom-tag'], type: TagsetType.FREEFORM },
      ];

      const result = service.updateClassificationTagsetInputs(
        provided,
        additional
      );

      expect(result[0].tags).toEqual(['custom-tag']);
    });

    it('should add non-matching provided inputs to result', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: [], type: TagsetType.FREEFORM },
      ];
      const provided: CreateTagsetInput[] = [
        { name: 'extra', tags: ['val'], type: TagsetType.FREEFORM },
      ];

      const result = service.updateClassificationTagsetInputs(
        provided,
        additional
      );

      expect(result).toHaveLength(2);
      expect(result[1].name).toBe('extra');
    });
  });
});
