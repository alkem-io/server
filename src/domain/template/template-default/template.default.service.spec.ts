import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateService } from '../template/template.service';
import { TemplateDefault } from './template.default.entity';
import { ITemplateDefault } from './template.default.interface';
import { TemplateDefaultService } from './template.default.service';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('TemplateDefaultService', () => {
  let service: TemplateDefaultService;
  let templateService: Mocked<TemplateService>;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateDefaultService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateDefaultService);
    templateService = module.get(TemplateService) as Mocked<TemplateService>;
    db = module.get(DRIZZLE);
  });

  describe('createTemplateDefault', () => {
    it('should create a TemplateDefault with correct type, template, and allowedTemplateType', () => {
      const input = {
        type: TemplateDefaultType.PLATFORM_SPACE,
        template: { id: 'template-1', type: TemplateType.SPACE } as any,
        allowedTemplateType: TemplateType.SPACE,
      };

      const result = service.createTemplateDefault(input);

      expect(result.type).toBe(TemplateDefaultType.PLATFORM_SPACE);
      expect(result.template).toBe(input.template);
      expect(result.allowedTemplateType).toBe(TemplateType.SPACE);
    });

    it('should assign an authorization policy of type TEMPLATE_DEFAULT', () => {
      const input = {
        type: TemplateDefaultType.SPACE_SUBSPACE,
        allowedTemplateType: TemplateType.SPACE,
      };

      const result = service.createTemplateDefault(input);

      expect(result.authorization).toBeDefined();
      expect(result.authorization!.type).toBe(
        AuthorizationPolicyType.TEMPLATE_DEFAULT
      );
    });

    it('should allow template to be undefined when not provided', () => {
      const input = {
        type: TemplateDefaultType.PLATFORM_SUBSPACE,
        allowedTemplateType: TemplateType.SPACE,
      };

      const result = service.createTemplateDefault(input);

      expect(result.template).toBeUndefined();
    });
  });

  describe('updateTemplateDefaultTemplate', () => {
    it('should update the template when the type matches the allowed type', async () => {
      const templateDefault: ITemplateDefault = {
        id: 'td-1',
        type: TemplateDefaultType.PLATFORM_SPACE,
        allowedTemplateType: TemplateType.SPACE,
      } as ITemplateDefault;

      const matchingTemplate = {
        id: 'template-1',
        type: TemplateType.SPACE,
      } as any;

      templateService.getTemplateOrFail.mockResolvedValue(matchingTemplate);
      db.returning.mockResolvedValueOnce([{ ...templateDefault, template: matchingTemplate }]);

      const result = await service.updateTemplateDefaultTemplate(
        templateDefault,
        { templateDefaultID: 'td-1', templateID: 'template-1' }
      );

      expect(result.template).toBe(matchingTemplate);
      expect(templateService.getTemplateOrFail).toHaveBeenCalledWith(
        'template-1'
      );
    });

    it('should throw ValidationException when template type does not match allowed type', async () => {
      const templateDefault: ITemplateDefault = {
        id: 'td-1',
        type: TemplateDefaultType.PLATFORM_SPACE,
        allowedTemplateType: TemplateType.SPACE,
      } as ITemplateDefault;

      const mismatchedTemplate = {
        id: 'template-2',
        type: TemplateType.WHITEBOARD,
      } as any;

      templateService.getTemplateOrFail.mockResolvedValue(mismatchedTemplate);

      await expect(
        service.updateTemplateDefaultTemplate(templateDefault, {
          templateDefaultID: 'td-1',
          templateID: 'template-2',
        })
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('getTemplateDefaultOrFail', () => {
    it('should return the template default when found', async () => {
      const expected = {
        id: 'td-1',
        type: TemplateDefaultType.PLATFORM_SPACE,
      } as TemplateDefault;

      db.query.templateDefaults.findFirst.mockResolvedValueOnce(expected);

      const result = await service.getTemplateDefaultOrFail('td-1');

      expect(result).toBe(expected);
    });

    it('should throw EntityNotFoundException when template default is not found', async () => {

      await expect(
        service.getTemplateDefaultOrFail('nonexistent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

  });

  describe('removeTemplateDefault', () => {
    it('should remove the template default and return true', async () => {
      const templateDefault = {
        id: 'td-1',
      } as ITemplateDefault;

      const result = await service.removeTemplateDefault(templateDefault);

      expect(result).toBe(true);
    });
  });
});
