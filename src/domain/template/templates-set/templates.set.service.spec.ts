import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked, vi } from 'vitest';
import { Repository } from 'typeorm';
import { TemplateService } from '../template/template.service';
import { ITemplate } from '../template/template.interface';
import { TemplatesSet } from './templates.set.entity';
import { TemplatesSetService } from './templates.set.service';
import { ITemplatesSet } from './templates.set.interface';

describe('TemplatesSetService', () => {
  let service: TemplatesSetService;
  let repository: Mocked<Repository<TemplatesSet>>;
  let templateService: Mocked<TemplateService>;
  let namingService: Mocked<NamingService>;
  let inputCreatorService: Mocked<InputCreatorService>;
  let storageAggregatorResolverService: Mocked<StorageAggregatorResolverService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;

  beforeEach(async () => {
    // Mock static TemplatesSet.create to avoid DataSource requirement
    vi.spyOn(TemplatesSet, 'create').mockImplementation((input: any) => {
      const entity = new TemplatesSet();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesSetService,
        repositoryProviderMockFactory(TemplatesSet),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplatesSetService);
    repository = module.get(
      getRepositoryToken(TemplatesSet)
    ) as Mocked<Repository<TemplatesSet>>;
    templateService = module.get(TemplateService) as Mocked<TemplateService>;
    namingService = module.get(NamingService) as Mocked<NamingService>;
    inputCreatorService = module.get(
      InputCreatorService
    ) as Mocked<InputCreatorService>;
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    ) as Mocked<StorageAggregatorResolverService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
  });

  describe('createTemplatesSet', () => {
    it('should create a templates set with authorization, empty templates array, and save it', async () => {
      repository.save.mockImplementation(async (entity: any) => entity);

      const result = await service.createTemplatesSet();

      expect(result.authorization).toBeDefined();
      expect(result.templates).toEqual([]);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getTemplatesSetOrFail', () => {
    it('should return templates set when found via static findOne', async () => {
      const expected = { id: 'ts-1' } as TemplatesSet;
      // TemplatesSet.findOne is a BaseEntity static method
      const findOneSpy = vi
        .spyOn(TemplatesSet, 'findOne')
        .mockResolvedValue(expected);

      const result = await service.getTemplatesSetOrFail('ts-1');

      expect(result).toBe(expected);
      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ts-1' },
        })
      );

      findOneSpy.mockRestore();
    });

    it('should throw EntityNotFoundException when not found', async () => {
      const findOneSpy = vi
        .spyOn(TemplatesSet, 'findOne')
        .mockResolvedValue(null);

      await expect(
        service.getTemplatesSetOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);

      findOneSpy.mockRestore();
    });
  });

  describe('deleteTemplatesSet', () => {
    it('should delete authorization, all templates, and the set itself', async () => {
      const template1 = { id: 'tpl-1' } as ITemplate;
      const template2 = { id: 'tpl-2' } as ITemplate;
      const templatesSet = {
        id: 'ts-1',
        authorization: { id: 'auth-1' },
        templates: [template1, template2],
      } as unknown as TemplatesSet;

      const findOneSpy = vi
        .spyOn(TemplatesSet, 'findOne')
        .mockResolvedValue(templatesSet);
      authorizationPolicyService.delete.mockResolvedValue({} as any);
      templateService.delete.mockResolvedValue({} as any);
      repository.remove.mockResolvedValue(templatesSet);

      await service.deleteTemplatesSet('ts-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        templatesSet.authorization
      );
      expect(templateService.delete).toHaveBeenCalledTimes(2);
      expect(repository.remove).toHaveBeenCalledWith(templatesSet);

      findOneSpy.mockRestore();
    });

    it('should skip authorization deletion when authorization is not loaded', async () => {
      const templatesSet = {
        id: 'ts-1',
        authorization: undefined,
        templates: [],
      } as unknown as TemplatesSet;

      const findOneSpy = vi
        .spyOn(TemplatesSet, 'findOne')
        .mockResolvedValue(templatesSet);
      repository.remove.mockResolvedValue(templatesSet);

      await service.deleteTemplatesSet('ts-1');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(repository.remove).toHaveBeenCalledWith(templatesSet);

      findOneSpy.mockRestore();
    });
  });

  describe('createTemplate', () => {
    const templatesSet = { id: 'ts-1' } as ITemplatesSet;
    const storageAggregator = { id: 'sa-1' } as any;

    beforeEach(() => {
      storageAggregatorResolverService.getStorageAggregatorForTemplatesSet.mockResolvedValue(
        storageAggregator
      );
      templateService.createTemplate.mockResolvedValue({
        id: 'tpl-new',
      } as any);
      templateService.save.mockImplementation(async (entity: any) => entity);
    });

    it('should throw ValidationException when provided nameID is already taken', async () => {
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([
        'existing-name',
      ]);

      await expect(
        service.createTemplate(templatesSet, {
          nameID: 'existing-name',
          type: TemplateType.POST,
          profileData: { displayName: 'Test' },
          tags: [],
        } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should use provided nameID when it is not reserved', async () => {
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([]);

      const input = {
        nameID: 'unique-name',
        type: TemplateType.POST,
        profileData: { displayName: 'Test' },
        tags: [],
        postDefaultDescription: 'desc',
      } as any;

      await service.createTemplate(templatesSet, input);

      expect(input.nameID).toBe('unique-name');
      expect(templateService.createTemplate).toHaveBeenCalledWith(
        input,
        storageAggregator
      );
    });

    it('should generate a nameID when none is provided', async () => {
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([]);
      namingService.createNameIdAvoidingReservedNameIDs.mockReturnValue(
        'generated-name'
      );

      const input = {
        nameID: '',
        type: TemplateType.POST,
        profileData: { displayName: 'My Template' },
        tags: [],
        postDefaultDescription: 'desc',
      } as any;

      await service.createTemplate(templatesSet, input);

      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalledWith('My Template', []);
      expect(input.nameID).toBe('generated-name');
    });

    it('should assign the templates set to the created template and save', async () => {
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([]);

      const createdTemplate = { id: 'tpl-new' } as any;
      templateService.createTemplate.mockResolvedValue(createdTemplate);
      templateService.save.mockResolvedValue({
        ...createdTemplate,
        templatesSet,
      });

      await service.createTemplate(templatesSet, {
        nameID: 'name',
        type: TemplateType.POST,
        profileData: { displayName: 'Test' },
        tags: [],
        postDefaultDescription: 'desc',
      } as any);

      expect(createdTemplate.templatesSet).toBe(templatesSet);
      expect(templateService.save).toHaveBeenCalledWith(createdTemplate);
    });
  });

  describe('createTemplateFromSpace', () => {
    it('should build content space input from space and create template with SPACE type', async () => {
      const templatesSet = { id: 'ts-1' } as ITemplatesSet;
      const contentSpaceInput = { about: {}, collaborationData: {} } as any;

      inputCreatorService.buildCreateTemplateContentSpaceInputFromSpace.mockResolvedValue(
        contentSpaceInput
      );
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([]);
      namingService.createNameIdAvoidingReservedNameIDs.mockReturnValue(
        'space-template'
      );
      storageAggregatorResolverService.getStorageAggregatorForTemplatesSet.mockResolvedValue(
        {} as any
      );
      templateService.createTemplate.mockResolvedValue({
        id: 'tpl-1',
      } as any);
      templateService.save.mockImplementation(async (entity: any) => entity);

      await service.createTemplateFromSpace(templatesSet, {
        spaceID: 'space-1',
        recursive: true,
        profileData: { displayName: 'From Space' },
        tags: [],
      } as any);

      expect(
        inputCreatorService.buildCreateTemplateContentSpaceInputFromSpace
      ).toHaveBeenCalledWith('space-1', true);
      expect(templateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TemplateType.SPACE,
          contentSpaceData: contentSpaceInput,
        }),
        expect.anything()
      );
    });
  });

  describe('createTemplateFromContentSpace', () => {
    it('should build input from content space and create template with SPACE type', async () => {
      const templatesSet = { id: 'ts-1' } as ITemplatesSet;
      const contentInput = { about: {}, collaborationData: {} } as any;

      inputCreatorService.buildCreateTemplateContentSpaceInputFromContentSpace.mockResolvedValue(
        contentInput
      );
      namingService.getReservedNameIDsInTemplatesSet.mockResolvedValue([]);
      namingService.createNameIdAvoidingReservedNameIDs.mockReturnValue(
        'content-template'
      );
      storageAggregatorResolverService.getStorageAggregatorForTemplatesSet.mockResolvedValue(
        {} as any
      );
      templateService.createTemplate.mockResolvedValue({
        id: 'tpl-1',
      } as any);
      templateService.save.mockImplementation(async (entity: any) => entity);

      await service.createTemplateFromContentSpace(templatesSet, {
        contentSpaceID: 'tcs-1',
        profileData: { displayName: 'From Content' },
        tags: [],
      } as any);

      expect(
        inputCreatorService.buildCreateTemplateContentSpaceInputFromContentSpace
      ).toHaveBeenCalledWith('tcs-1');
      expect(templateService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TemplateType.SPACE,
          contentSpaceData: contentInput,
        }),
        expect.anything()
      );
    });
  });

  describe('getTemplatesCount', () => {
    it('should sum counts across all template types', async () => {
      templateService.getCountInTemplatesSet
        .mockResolvedValueOnce(3)  // WHITEBOARD
        .mockResolvedValueOnce(2)  // POST
        .mockResolvedValueOnce(1)  // SPACE
        .mockResolvedValueOnce(4)  // CALLOUT
        .mockResolvedValueOnce(0); // COMMUNITY_GUIDELINES

      const result = await service.getTemplatesCount('ts-1');

      expect(result).toBe(10);
      expect(templateService.getCountInTemplatesSet).toHaveBeenCalledTimes(5);
    });

    it('should return zero when all types have zero count', async () => {
      templateService.getCountInTemplatesSet.mockResolvedValue(0);

      const result = await service.getTemplatesCount('ts-1');

      expect(result).toBe(0);
    });
  });

  describe('getTemplatesCountForType', () => {
    it('should delegate to templateService.getCountInTemplatesSet', async () => {
      templateService.getCountInTemplatesSet.mockResolvedValue(5);

      const result = await service.getTemplatesCountForType(
        'ts-1',
        TemplateType.WHITEBOARD
      );

      expect(result).toBe(5);
      expect(templateService.getCountInTemplatesSet).toHaveBeenCalledWith(
        'ts-1',
        TemplateType.WHITEBOARD
      );
    });
  });

  describe('getTemplate', () => {
    it('should delegate to templateService.getTemplateOrFail with correct where and relations', async () => {
      const expected = { id: 'tpl-1' } as any;
      templateService.getTemplateOrFail.mockResolvedValue(expected);

      const result = await service.getTemplate('tpl-1', 'ts-1');

      expect(result).toBe(expected);
      expect(templateService.getTemplateOrFail).toHaveBeenCalledWith('tpl-1', {
        where: { templatesSet: { id: 'ts-1' } },
        relations: { templatesSet: true, profile: true },
      });
    });
  });

  describe('getTemplates', () => {
    it('should delegate to templateService.getTemplatesInTemplatesSet', async () => {
      const expected = [{ id: 'tpl-1' }] as any;
      templateService.getTemplatesInTemplatesSet.mockResolvedValue(expected);

      const result = await service.getTemplates({ id: 'ts-1' } as ITemplatesSet);

      expect(result).toBe(expected);
      expect(templateService.getTemplatesInTemplatesSet).toHaveBeenCalledWith(
        'ts-1'
      );
    });
  });

  describe('getTemplatesOfType', () => {
    it('should delegate to templateService.getTemplateTypeInTemplatesSet', async () => {
      const expected = [{ id: 'tpl-1' }] as any;
      templateService.getTemplateTypeInTemplatesSet.mockResolvedValue(expected);

      const result = await service.getTemplatesOfType(
        { id: 'ts-1' } as ITemplatesSet,
        TemplateType.POST
      );

      expect(result).toBe(expected);
      expect(
        templateService.getTemplateTypeInTemplatesSet
      ).toHaveBeenCalledWith('ts-1', TemplateType.POST);
    });
  });
});
