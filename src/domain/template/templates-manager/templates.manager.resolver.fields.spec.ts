import { vi } from 'vitest';
import { ITemplatesManager } from './templates.manager.interface';
import { TemplatesManagerResolverFields } from './templates.manager.resolver.fields';
import { TemplatesManagerService } from './templates.manager.service';

describe('TemplatesManagerResolverFields', () => {
  let resolver: TemplatesManagerResolverFields;
  let templatesManagerService: {
    getTemplateDefaults: ReturnType<typeof vi.fn>;
    getTemplatesSetOrFail: ReturnType<typeof vi.fn>;
  };

  const templatesManager = { id: 'tm-1' } as ITemplatesManager;

  beforeEach(() => {
    templatesManagerService = {
      getTemplateDefaults: vi.fn(),
      getTemplatesSetOrFail: vi.fn(),
    };
    resolver = new TemplatesManagerResolverFields(
      templatesManagerService as unknown as TemplatesManagerService
    );
  });

  describe('templateDefaults', () => {
    it('should delegate to service.getTemplateDefaults', async () => {
      const defaults = [{ id: 'td-1' }, { id: 'td-2' }];
      templatesManagerService.getTemplateDefaults.mockResolvedValue(defaults);

      const result = await resolver.templateDefaults(templatesManager);

      expect(result).toBe(defaults);
      expect(templatesManagerService.getTemplateDefaults).toHaveBeenCalledWith(
        'tm-1'
      );
    });
  });

  describe('templatesSet', () => {
    it('should delegate to service.getTemplatesSetOrFail', async () => {
      const templatesSet = { id: 'ts-1' };
      templatesManagerService.getTemplatesSetOrFail.mockResolvedValue(
        templatesSet
      );

      const result = await resolver.templatesSet(templatesManager);

      expect(result).toBe(templatesSet);
      expect(
        templatesManagerService.getTemplatesSetOrFail
      ).toHaveBeenCalledWith('tm-1');
    });
  });
});
