import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LoggerService } from '@nestjs/common';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { TemplateService } from '../template/template.service';
import { TemplateDefaultService } from '../template-default/template.default.service';
import { TemplatesManagerResolverMutations } from './templates.manager.resolver.mutations';

describe('TemplatesManagerResolverMutations', () => {
  let resolver: TemplatesManagerResolverMutations;
  let authorizationService: { grantAccessOrFail: ReturnType<typeof vi.fn> };
  let templateDefaultService: {
    getTemplateDefaultOrFail: ReturnType<typeof vi.fn>;
    updateTemplateDefaultTemplate: ReturnType<typeof vi.fn>;
  };
  let templateService: { getTemplateOrFail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authorizationService = { grantAccessOrFail: vi.fn() };
    templateDefaultService = {
      getTemplateDefaultOrFail: vi.fn(),
      updateTemplateDefaultTemplate: vi.fn(),
    };
    templateService = { getTemplateOrFail: vi.fn() };

    resolver = new TemplatesManagerResolverMutations(
      authorizationService as unknown as AuthorizationService,
      templateDefaultService as unknown as TemplateDefaultService,
      templateService as unknown as TemplateService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateTemplateDefault', () => {
    it('should throw RelationshipNotFoundException when templatesManager relations are missing', async () => {
      templateDefaultService.getTemplateDefaultOrFail.mockResolvedValue({
        id: 'td-1',
        type: 'platform_space',
        authorization: { id: 'td-auth' },
        templatesManager: undefined,
      } as any);

      const actorContext = { actorID: 'user-1' } as any;
      const input = {
        templateDefaultID: 'td-1',
        templateID: 'tpl-1',
      };

      await expect(
        resolver.updateTemplateDefault(actorContext, input)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw ValidationException when template is not in the templates set', async () => {
      templateDefaultService.getTemplateDefaultOrFail.mockResolvedValue({
        id: 'td-1',
        type: 'platform_space',
        authorization: { id: 'td-auth' },
        templatesManager: {
          id: 'tm-1',
          templatesSet: {
            id: 'ts-1',
            templates: [{ id: 'tpl-other' }],
          },
        },
      } as any);

      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
      } as any);

      const actorContext = { actorID: 'user-1' } as any;
      const input = {
        templateDefaultID: 'td-1',
        templateID: 'tpl-1',
      };

      await expect(
        resolver.updateTemplateDefault(actorContext, input)
      ).rejects.toThrow(ValidationException);
    });

    it('should update template default when template is in the templates set', async () => {
      const templateDefault = {
        id: 'td-1',
        type: 'platform_space',
        authorization: { id: 'td-auth' },
        templatesManager: {
          id: 'tm-1',
          templatesSet: {
            id: 'ts-1',
            templates: [{ id: 'tpl-1' }, { id: 'tpl-2' }],
          },
        },
      };

      templateDefaultService.getTemplateDefaultOrFail.mockResolvedValue(
        templateDefault as any
      );
      templateService.getTemplateOrFail.mockResolvedValue({
        id: 'tpl-1',
      } as any);

      const updatedDefault = { ...templateDefault, template: { id: 'tpl-1' } };
      templateDefaultService.updateTemplateDefaultTemplate.mockResolvedValue(
        updatedDefault
      );

      const actorContext = { actorID: 'user-1' } as any;
      const input = {
        templateDefaultID: 'td-1',
        templateID: 'tpl-1',
      };

      const result = await resolver.updateTemplateDefault(actorContext, input);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        templateDefaultService.updateTemplateDefaultTemplate
      ).toHaveBeenCalledWith(templateDefault, input);
      expect(result).toBe(updatedDefault);
    });
  });
});
