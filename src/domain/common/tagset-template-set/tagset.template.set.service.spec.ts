import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { TagsetTemplateSet } from './tagset.template.set.entity';
import { TagsetTemplateSetService } from './tagset.template.set.service';
import { EntityNotFoundException, ValidationException } from '@common/exceptions';
import { TagsetTemplateService } from '../tagset-template/tagset.template.service';
import { TagsetType } from '@common/enums/tagset.type';
import { ITagsetTemplateSet } from './tagset.template.set.interface';

describe('TagsetTemplateSetService', () => {
  let service: TagsetTemplateSetService;
  let tagsetTemplateService: TagsetTemplateService;

  beforeEach(async () => {
    // Mock static TagsetTemplateSet.create to avoid DataSource requirement
    vi.spyOn(TagsetTemplateSet, 'create').mockImplementation((input: any) => {
      const entity = new TagsetTemplateSet();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsetTemplateSetService,
        repositoryProviderMockFactory(TagsetTemplateSet),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TagsetTemplateSetService);
    tagsetTemplateService = module.get(TagsetTemplateService);
  });

  describe('createTagsetTemplateSet', () => {
    it('should create a tagset template set with empty tagsetTemplates array', () => {
      const result = service.createTagsetTemplateSet();

      expect(result).toBeDefined();
      expect(result.tagsetTemplates).toEqual([]);
    });
  });

  describe('getTagsetTemplatesOrFail', () => {
    it('should return tagset templates when present', () => {
      const templates = [
        { id: 'tt-1', name: 'skills' },
        { id: 'tt-2', name: 'keywords' },
      ];
      const set = {
        id: 'tts-1',
        tagsetTemplates: templates,
      } as unknown as ITagsetTemplateSet;

      const result = service.getTagsetTemplatesOrFail(set);

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when tagsetTemplates is undefined', () => {
      const set = {
        id: 'tts-1',
        tagsetTemplates: undefined,
      } as unknown as ITagsetTemplateSet;

      expect(() => service.getTagsetTemplatesOrFail(set)).toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('addTagsetTemplate', () => {
    it('should add a new tagset template to the set', () => {
      (tagsetTemplateService.createTagsetTemplate as Mock).mockReturnValue({
        id: 'tt-new',
        name: 'new-template',
        type: TagsetType.FREEFORM,
        allowedValues: [],
      } as any);

      const set = {
        id: 'tts-1',
        tagsetTemplates: [],
      } as unknown as ITagsetTemplateSet;

      const result = service.addTagsetTemplate(set, {
        name: 'new-template',
        type: TagsetType.FREEFORM,
        allowedValues: [],
      });

      expect(result.tagsetTemplates).toHaveLength(1);
      expect(result.tagsetTemplates[0].name).toBe('new-template');
    });

    it('should throw ValidationException when template with same name already exists', () => {
      const set = {
        id: 'tts-1',
        tagsetTemplates: [
          { id: 'tt-1', name: 'skills', type: TagsetType.SELECT_MANY },
        ],
      } as unknown as ITagsetTemplateSet;

      expect(() =>
        service.addTagsetTemplate(set, {
          name: 'skills',
          type: TagsetType.SELECT_MANY,
          allowedValues: [],
        })
      ).toThrow(ValidationException);
    });
  });
});
