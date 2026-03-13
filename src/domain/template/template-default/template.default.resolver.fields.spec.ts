import { vi } from 'vitest';
import { TemplateService } from '../template/template.service';
import { ITemplateDefault } from './template.default.interface';
import { TemplateDefaultResolverFields } from './template.default.resolver.fields';

describe('TemplateDefaultResolverFields', () => {
  let resolver: TemplateDefaultResolverFields;
  let templateService: {
    getTemplateOrFail: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    templateService = {
      getTemplateOrFail: vi.fn(),
    };
    resolver = new TemplateDefaultResolverFields(
      templateService as unknown as TemplateService
    );
  });

  describe('template', () => {
    it('should return null when templateDefault has no template', async () => {
      const templateDefault = {
        id: 'td-1',
        template: undefined,
      } as unknown as ITemplateDefault;

      const result = await resolver.template(templateDefault);

      expect(result).toBeNull();
      expect(templateService.getTemplateOrFail).not.toHaveBeenCalled();
    });

    it('should reload and return template when templateDefault has a template', async () => {
      const fullTemplate = { id: 'tpl-1', authorization: {} };
      templateService.getTemplateOrFail.mockResolvedValue(fullTemplate);

      const templateDefault = {
        id: 'td-1',
        template: { id: 'tpl-1' },
      } as unknown as ITemplateDefault;

      const result = await resolver.template(templateDefault);

      expect(result).toBe(fullTemplate);
      expect(templateService.getTemplateOrFail).toHaveBeenCalledWith('tpl-1');
    });
  });
});
