import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ITemplateDefault } from '../template-default/template.default.interface';
import { TemplateDefaultService } from '../template-default/template.default.service';
import { TemplatesSetService } from '../templates-set/templates.set.service';
import { TemplatesManager } from './templates.manager.entity';
import { TemplatesManagerService } from './templates.manager.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('TemplatesManagerService', () => {
  let service: TemplatesManagerService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let templatesSetService: Mocked<TemplatesSetService>;
  let templateDefaultService: Mocked<TemplateDefaultService>;
  let db: any;

  beforeEach(async () => {
    // Mock static TemplatesManager.create to avoid DataSource requirement
    vi.spyOn(TemplatesManager, 'create').mockImplementation((input: any) => {
      const entity = new TemplatesManager();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesManagerService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplatesManagerService);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    templatesSetService = module.get(
      TemplatesSetService
    ) as Mocked<TemplatesSetService>;
    templateDefaultService = module.get(
      TemplateDefaultService
    ) as Mocked<TemplateDefaultService>;
    db = module.get(DRIZZLE);
  });

  describe('getTemplatesManagerOrFail', () => {
    it('should return the templates manager when found', async () => {
      const expected = { id: 'tm-1' } as TemplatesManager;

      db.query.templatesManagers.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplatesManagerOrFail('tm-1');

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(
        service.getTemplatesManagerOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should merge provided options with the id where clause', async () => {
      const expected = { id: 'tm-1' } as TemplatesManager;

      db.query.templatesManagers.findFirst.mockResolvedValueOnce(expected);

      await service.getTemplatesManagerOrFail('tm-1', {
        relations: { templateDefaults: true },
      });

    });
  });

  describe('createTemplatesManager', () => {
    it('should create a templates manager with templates set and template defaults', async () => {
      const mockTemplatesSet = { id: 'ts-1' } as any;
      templatesSetService.createTemplatesSet.mockResolvedValue(
        mockTemplatesSet
      );
      // Mock the db.insert().values().returning() for createTemplatesManager

      const mockDefault1 = {
        id: 'td-1',
        type: TemplateDefaultType.PLATFORM_SPACE,
      } as any;
      const mockDefault2 = {
        id: 'td-2',
        type: TemplateDefaultType.SPACE_SUBSPACE,
      } as any;
      templateDefaultService.createTemplateDefault
        .mockReturnValueOnce(mockDefault1)
        .mockReturnValueOnce(mockDefault2);

      db.returning.mockResolvedValueOnce([{
        id: 'tm-1',
        templatesSet: mockTemplatesSet,
        templateDefaults: [mockDefault1, mockDefault2],
      }]);

      const result = await service.createTemplatesManager({
        templateDefaultsData: [
          {
            type: TemplateDefaultType.PLATFORM_SPACE,
            allowedTemplateType: TemplateType.SPACE,
          },
          {
            type: TemplateDefaultType.SPACE_SUBSPACE,
            allowedTemplateType: TemplateType.SPACE,
          },
        ],
      });

      expect(templatesSetService.createTemplatesSet).toHaveBeenCalledTimes(1);
      expect(
        templateDefaultService.createTemplateDefault
      ).toHaveBeenCalledTimes(2);
      expect(result.templateDefaults).toHaveLength(2);
      expect(result.templatesSet).toBe(mockTemplatesSet);
    });

    it('should create a templates manager with empty template defaults when none provided', async () => {
      const mockTemplatesSet = { id: 'ts-1' } as any;
      templatesSetService.createTemplatesSet.mockResolvedValue(
        mockTemplatesSet
      );

      db.returning.mockResolvedValueOnce([{
        id: 'tm-1',
        templatesSet: mockTemplatesSet,
        templateDefaults: [],
      }]);

      const result = await service.createTemplatesManager({
        templateDefaultsData: [],
      });

      expect(result.templateDefaults).toHaveLength(0);
      expect(
        templateDefaultService.createTemplateDefault
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteTemplatesManager', () => {
    it('should delete authorization, all template defaults, templates set, and the manager itself', async () => {
      const manager = {
        id: 'tm-1',
        authorization: { id: 'auth-1' },
        templateDefaults: [
          { id: 'td-1' } as ITemplateDefault,
          { id: 'td-2' } as ITemplateDefault,
        ],
        templatesSet: { id: 'ts-1' },
      } as unknown as TemplatesManager;

      db.query.templatesManagers.findFirst.mockResolvedValueOnce(manager);

      authorizationPolicyService.delete.mockResolvedValue({} as any);
      templateDefaultService.removeTemplateDefault.mockResolvedValue(true);
      templatesSetService.deleteTemplatesSet.mockResolvedValue({} as any);

      const result = await service.deleteTemplatesManager('tm-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        manager.authorization
      );
      expect(
        templateDefaultService.removeTemplateDefault
      ).toHaveBeenCalledTimes(2);
      expect(templatesSetService.deleteTemplatesSet).toHaveBeenCalledWith(
        'ts-1'
      );
      expect(result.id).toBe('tm-1');
    });

    it('should throw EntityNotFoundException when required relations are missing', async () => {
      const manager = {
        id: 'tm-1',
        authorization: undefined,
        templateDefaults: undefined,
        templatesSet: undefined,
      } as unknown as TemplatesManager;

      db.query.templatesManagers.findFirst.mockResolvedValueOnce(manager);

      await expect(service.deleteTemplatesManager('tm-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getTemplateDefault', () => {
    it('should return the matching template default by type', async () => {
      const templateDefaults = [
        {
          id: 'td-1',
          type: TemplateDefaultType.PLATFORM_SPACE,
          authorization: {},
        },
        {
          id: 'td-2',
          type: TemplateDefaultType.SPACE_SUBSPACE,
          authorization: {},
        },
      ] as ITemplateDefault[];

      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults,
      });

      const result = await service.getTemplateDefault(
        'tm-1',
        TemplateDefaultType.SPACE_SUBSPACE
      );

      expect(result.id).toBe('td-2');
      expect(result.type).toBe(TemplateDefaultType.SPACE_SUBSPACE);
    });

    it('should throw EntityNotFoundException when no template default matches the type', async () => {
      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults: [],
      });

      await expect(
        service.getTemplateDefault(
          'tm-1',
          TemplateDefaultType.PLATFORM_SUBSPACE
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getTemplateFromTemplateDefault', () => {
    it('should return the template when it exists on the template default', async () => {
      const template = { id: 'tpl-1', type: TemplateType.SPACE };

      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults: [
          { id: 'td-1', type: TemplateDefaultType.PLATFORM_SPACE, authorization: {}, template },
        ],
      });

      const result = await service.getTemplateFromTemplateDefault(
        'tm-1',
        TemplateDefaultType.PLATFORM_SPACE
      );

      expect(result).toBe(template);
    });

    it('should throw EntityNotFoundException when template default has no template', async () => {
      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults: [
          { id: 'td-1', type: TemplateDefaultType.PLATFORM_SPACE, authorization: {}, template: undefined },
        ],
      });

      await expect(
        service.getTemplateFromTemplateDefault(
          'tm-1',
          TemplateDefaultType.PLATFORM_SPACE
        )
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getTemplateDefaults', () => {
    it('should return template defaults when loaded', async () => {
      const templateDefaults = [
        { id: 'td-1' } as ITemplateDefault,
        { id: 'td-2' } as ITemplateDefault,
      ];

      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults,
      });

      const result = await service.getTemplateDefaults('tm-1');

      expect(result).toBe(templateDefaults);
      expect(result).toHaveLength(2);
    });

    it('should throw RelationshipNotFoundException when templateDefaults is not loaded', async () => {
      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templateDefaults: undefined,
      });

      await expect(service.getTemplateDefaults('tm-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getTemplatesSetOrFail', () => {
    it('should return the templates set when loaded', async () => {
      const templatesSet = { id: 'ts-1' };

      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templatesSet,
      });

      const result = await service.getTemplatesSetOrFail('tm-1');

      expect(result).toBe(templatesSet);
    });

    it('should throw RelationshipNotFoundException when templatesSet is not loaded', async () => {
      db.query.templatesManagers.findFirst.mockResolvedValueOnce({
        id: 'tm-1',
        templatesSet: undefined,
      });

      await expect(service.getTemplatesSetOrFail('tm-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
