import { TagsetType } from '@common/enums/tagset.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { TagsetTemplate } from './tagset.template.entity';
import { ITagsetTemplate } from './tagset.template.interface';
import { TagsetTemplateService } from './tagset.template.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('TagsetTemplateService', () => {
  let service: TagsetTemplateService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsetTemplateService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TagsetTemplateService);
    db = module.get(DRIZZLE);
  });

  describe('createTagsetTemplate', () => {
    it('should create a tagset template with all provided fields', () => {
      const result = service.createTagsetTemplate({
        name: 'skills',
        type: TagsetType.SELECT_MANY,
        allowedValues: ['typescript', 'javascript'],
        defaultSelectedValue: 'typescript',
      });

      expect(result.name).toBe('skills');
      expect(result.type).toBe(TagsetType.SELECT_MANY);
      expect(result.allowedValues).toEqual(['typescript', 'javascript']);
      expect(result.defaultSelectedValue).toBe('typescript');
    });

    it('should create a tagset template without defaultSelectedValue', () => {
      const result = service.createTagsetTemplate({
        name: 'keywords',
        type: TagsetType.FREEFORM,
        allowedValues: [],
      });

      expect(result.name).toBe('keywords');
      expect(result.defaultSelectedValue).toBeUndefined();
    });
  });

  describe('getTagsetTemplateOrFail', () => {
    it('should return the tagset template when found', async () => {
      const template = { id: 'tt-1', name: 'skills' } as TagsetTemplate;
      db.query.tagsetTemplates.findFirst.mockResolvedValueOnce(template);

      const result = await service.getTagsetTemplateOrFail('tt-1');

      expect(result).toBe(template);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getTagsetTemplateOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeTagsetTemplate', () => {
    it('should remove and return the template with preserved id', async () => {
      const template = { id: 'tt-1', name: 'skills' } as ITagsetTemplate;

      const result = await service.removeTagsetTemplate(template);

      expect(result.id).toBe('tt-1');
    });
  });

  describe('updateTagsetTemplateDefinition', () => {
    it('should update allowedValues when provided', async () => {
      const template = {
        id: 'tt-1',
        allowedValues: ['a'],
        defaultSelectedValue: 'a',
      } as ITagsetTemplate;

      await service.updateTagsetTemplateDefinition(template, {
        allowedValues: ['a', 'b', 'c'],
      });

      expect(template.allowedValues).toEqual(['a', 'b', 'c']);
    });

    it('should update defaultSelectedValue when provided', async () => {
      const template = {
        id: 'tt-1',
        allowedValues: ['a', 'b'],
        defaultSelectedValue: 'a',
      } as ITagsetTemplate;

      await service.updateTagsetTemplateDefinition(template, {
        defaultSelectedValue: 'b',
      } as any);

      expect(template.defaultSelectedValue).toBe('b');
    });

    it('should not change fields when not provided in update data', async () => {
      const template = {
        id: 'tt-1',
        allowedValues: ['x'],
        defaultSelectedValue: 'x',
      } as ITagsetTemplate;

      await service.updateTagsetTemplateDefinition(template, {} as any);

      expect(template.allowedValues).toEqual(['x']);
      expect(template.defaultSelectedValue).toBe('x');
    });
  });

  describe('getTagsetsUsingTagsetTemplate', () => {
    it('should return tagsets associated with the template', async () => {
      const tagsets = [{ id: 'ts-1' }, { id: 'ts-2' }];
      const template = { id: 'tt-1', tagsets } as unknown as TagsetTemplate;
      db.query.tagsetTemplates.findFirst.mockResolvedValueOnce(template);

      const result = await service.getTagsetsUsingTagsetTemplate('tt-1');

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when tagsets not loaded', async () => {
      const template = {
        id: 'tt-1',
        tagsets: undefined,
      } as unknown as TagsetTemplate;
      db.query.tagsetTemplates.findFirst.mockResolvedValueOnce(template);

      await expect(
        service.getTagsetsUsingTagsetTemplate('tt-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
