import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { CreateTagsetInput } from '../tagset/dto/tagset.dto.create';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { Classification } from './classification.entity';
import { IClassification } from './classification.interface';
import { ClassificationService } from './classification.service';

describe('ClassificationService', () => {
  let service: ClassificationService;
  let tagsetService: TagsetService;
  let classificationRepository: MockType<Repository<Classification>>;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    classificationRepository = module.get(getRepositoryToken(Classification));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
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

    it('should not override tags when provided input has no tags', () => {
      const additional: CreateTagsetInput[] = [
        { name: 'skills', tags: ['original'], type: TagsetType.FREEFORM },
      ];
      const provided: CreateTagsetInput[] = [
        { name: 'skills', type: TagsetType.FREEFORM },
      ];

      const result = service.updateClassificationTagsetInputs(
        provided,
        additional
      );

      expect(result[0].tags).toEqual(['original']);
    });
  });

  describe('deleteClassification', () => {
    it('should delete tagsets, authorization, and remove the classification', async () => {
      const classification = {
        id: 'cls-1',
        tagsets: [{ id: 'ts-1' }, { id: 'ts-2' }],
        authorization: { id: 'auth-1' },
      } as unknown as Classification;

      vi.spyOn(Classification, 'findOne').mockResolvedValue(
        classification as any
      );
      (tagsetService.removeTagset as Mock).mockResolvedValue({} as any);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);
      classificationRepository.remove!.mockResolvedValue(classification);

      await service.deleteClassification('cls-1');

      expect(tagsetService.removeTagset).toHaveBeenCalledTimes(2);
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('ts-1');
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('ts-2');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        classification.authorization
      );
    });

    it('should throw EntityNotInitializedException when tagsets or authorization not loaded', async () => {
      const classification = {
        id: 'cls-1',
        tagsets: undefined,
        authorization: undefined,
      } as unknown as Classification;

      vi.spyOn(Classification, 'findOne').mockResolvedValue(
        classification as any
      );

      await expect(service.deleteClassification('cls-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });

    it('should throw EntityNotFoundException when classification not found', async () => {
      vi.spyOn(Classification, 'findOne').mockResolvedValue(null as any);

      await expect(service.deleteClassification('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getClassificationOrFail', () => {
    it('should return classification when found', async () => {
      const classification = { id: 'cls-1' } as Classification;
      vi.spyOn(Classification, 'findOne').mockResolvedValue(
        classification as any
      );

      const result = await service.getClassificationOrFail('cls-1');

      expect(result).toBe(classification);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      vi.spyOn(Classification, 'findOne').mockResolvedValue(null as any);

      await expect(service.getClassificationOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getTagsets', () => {
    it('should return tagsets when initialized', async () => {
      const tagsets = [{ id: 'ts-1', name: 'skills' }];
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets,
      } as any);

      const result = await service.getTagsets('cls-1');

      expect(result).toEqual(tagsets);
    });

    it('should throw EntityNotInitializedException when tagsets not initialized', async () => {
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: undefined,
      } as any);

      await expect(service.getTagsets('cls-1')).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('save', () => {
    it('should persist classification to repository', async () => {
      const classification = { id: 'cls-1' } as IClassification;
      classificationRepository.save!.mockResolvedValue(classification);

      const result = await service.save(classification);

      expect(result).toBe(classification);
    });
  });

  describe('addTagsetOnClassification', () => {
    it('should create and save a tagset on the classification', async () => {
      const classification = {
        id: 'cls-1',
        tagsets: [{ id: 'ts-1', name: 'skills' }],
      } as unknown as IClassification;

      const newTagset = { id: 'ts-new', name: 'keywords', tags: [] };
      (tagsetService.createTagsetWithName as Mock).mockReturnValue(
        newTagset as any
      );
      (tagsetService.save as Mock).mockResolvedValue(newTagset as any);

      const result = await service.addTagsetOnClassification(classification, {
        name: 'keywords',
        tags: [],
      });

      expect(result).toBe(newTagset);
      expect(tagsetService.createTagsetWithName).toHaveBeenCalledWith(
        classification.tagsets,
        { name: 'keywords', tags: [] }
      );
    });

    it('should load tagsets if not initialized', async () => {
      const classification = {
        id: 'cls-1',
        tagsets: undefined,
      } as unknown as IClassification;

      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [{ id: 'ts-1', name: 'skills' }],
      } as any);

      const newTagset = { id: 'ts-new', name: 'keywords', tags: [] };
      (tagsetService.createTagsetWithName as Mock).mockReturnValue(
        newTagset as any
      );
      (tagsetService.save as Mock).mockResolvedValue(newTagset as any);

      await service.addTagsetOnClassification(classification, {
        name: 'keywords',
        tags: [],
      });

      expect(Classification.findOne).toHaveBeenCalled();
    });
  });

  describe('updateSelectTagsetValue', () => {
    it('should update the tagset with the selected value', async () => {
      const tagsets = [{ id: 'ts-1', name: 'category', tags: ['old'] }];
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets,
      } as any);
      (tagsetService.getTagsetByNameOrFail as Mock).mockReturnValue(tagsets[0]);
      (tagsetService.updateTagset as Mock).mockResolvedValue({
        id: 'ts-1',
        tags: ['new-value'],
      } as any);

      const result = await service.updateSelectTagsetValue({
        classificationID: 'cls-1',
        tagsetName: 'category',
        selectedValue: 'new-value',
      });

      expect(tagsetService.updateTagset).toHaveBeenCalledWith({
        ID: 'ts-1',
        tags: ['new-value'],
      });
      expect(result.tags).toEqual(['new-value']);
    });
  });

  describe('updateTagsetTemplateOnSelectTagset', () => {
    it('should fall back to default tags when template has no allowedValues', async () => {
      const existingTagset = { id: 'ts-1', name: 'category', tags: ['old'] };
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [existingTagset],
      } as any);
      (tagsetService.getTagsetByName as Mock).mockReturnValue(existingTagset);
      (tagsetService.save as Mock).mockResolvedValue(existingTagset as any);

      const template = {
        name: 'category',
        type: TagsetType.SELECT_ONE,
        defaultSelectedValue: 'default-val',
      } as unknown as ITagsetTemplate;

      const result = await service.updateTagsetTemplateOnSelectTagset(
        'cls-1',
        template
      );

      expect(existingTagset.tags).toEqual(['default-val']);
      expect(result).toBe(existingTagset);
    });

    it('should preserve current tag when present in target template allowedValues', async () => {
      const existingTagset = {
        id: 'ts-1',
        name: TagsetReservedName.FLOW_STATE,
        tags: ['EXPLORE'],
      };
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [existingTagset],
      } as any);
      (tagsetService.getTagsetByName as Mock).mockReturnValue(existingTagset);
      (tagsetService.save as Mock).mockResolvedValue(existingTagset as any);

      const template = {
        name: TagsetReservedName.FLOW_STATE,
        type: TagsetType.SELECT_ONE,
        allowedValues: ['EXPLORE', 'DEFINE', 'BRAINSTORM'],
        defaultSelectedValue: 'DEFINE',
      } as unknown as ITagsetTemplate;

      await service.updateTagsetTemplateOnSelectTagset('cls-1', template);

      expect(existingTagset.tags).toEqual(['EXPLORE']);
      expect((existingTagset as any).tagsetTemplate).toBe(template);
    });

    it('should fall back to default when current tag absent from target template allowedValues', async () => {
      const existingTagset = {
        id: 'ts-1',
        name: TagsetReservedName.FLOW_STATE,
        tags: ['HOME'],
      };
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [existingTagset],
      } as any);
      (tagsetService.getTagsetByName as Mock).mockReturnValue(existingTagset);
      (tagsetService.save as Mock).mockResolvedValue(existingTagset as any);

      const template = {
        name: TagsetReservedName.FLOW_STATE,
        type: TagsetType.SELECT_ONE,
        allowedValues: ['EXPLORE', 'DEFINE', 'BRAINSTORM'],
        defaultSelectedValue: 'EXPLORE',
      } as unknown as ITagsetTemplate;

      await service.updateTagsetTemplateOnSelectTagset('cls-1', template);

      expect(existingTagset.tags).toEqual(['EXPLORE']);
      expect((existingTagset as any).tagsetTemplate).toBe(template);
    });

    it('should create new tagset when template name not found in classification', async () => {
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [],
      } as any);
      (tagsetService.getTagsetByName as Mock).mockReturnValue(undefined);

      const newTagset = { id: 'ts-new', name: 'newCat', tags: ['default'] };
      (tagsetService.createTagsetWithName as Mock).mockReturnValue(
        newTagset as any
      );
      (tagsetService.save as Mock).mockResolvedValue(newTagset as any);

      const template = {
        name: 'newCat',
        type: TagsetType.SELECT_ONE,
        defaultSelectedValue: 'default',
      } as unknown as ITagsetTemplate;

      await service.updateTagsetTemplateOnSelectTagset('cls-1', template);

      // It calls addTagsetOnClassification which calls createTagsetWithName
      expect(tagsetService.createTagsetWithName).toHaveBeenCalled();
    });

    it('should use empty tags array when template has no defaultSelectedValue', async () => {
      const existingTagset = { id: 'ts-1', name: 'category', tags: ['old'] };
      vi.spyOn(Classification, 'findOne').mockResolvedValue({
        id: 'cls-1',
        tagsets: [existingTagset],
      } as any);
      (tagsetService.getTagsetByName as Mock).mockReturnValue(existingTagset);
      (tagsetService.save as Mock).mockResolvedValue(existingTagset as any);

      const template = {
        name: 'category',
        type: TagsetType.SELECT_ONE,
        defaultSelectedValue: undefined,
      } as unknown as ITagsetTemplate;

      await service.updateTagsetTemplateOnSelectTagset('cls-1', template);

      expect(existingTagset.tags).toEqual([]);
    });
  });
});
