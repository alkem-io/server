import { vi } from 'vitest';
import { ITemplateContentSpace } from './template.content.space.interface';
import { TemplateContentSpaceResolverFields } from './template.content.space.resolver.fields';
import { TemplateContentSpaceService } from './template.content.space.service';

describe('TemplateContentSpaceResolverFields', () => {
  let resolver: TemplateContentSpaceResolverFields;
  let templateContentSpaceService: {
    getSubspaces: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    templateContentSpaceService = {
      getSubspaces: vi.fn(),
    };
    resolver = new TemplateContentSpaceResolverFields(
      templateContentSpaceService as unknown as TemplateContentSpaceService
    );
  });

  describe('subspaces', () => {
    it('should delegate to service.getSubspaces', async () => {
      const subspaces = [{ id: 'sub-1' }, { id: 'sub-2' }];
      templateContentSpaceService.getSubspaces.mockResolvedValue(subspaces);

      const tcs = { id: 'tcs-1' } as ITemplateContentSpace;

      const result = await resolver.subspaces(tcs);

      expect(result).toBe(subspaces);
      expect(templateContentSpaceService.getSubspaces).toHaveBeenCalledWith(
        'tcs-1'
      );
    });
  });

  describe('settings', () => {
    it('should return the settings from the template content space', () => {
      const settings = { privacy: {}, collaboration: {} } as any;
      const tcs = { id: 'tcs-1', settings } as unknown as ITemplateContentSpace;

      const result = resolver.settings(tcs);

      expect(result).toBe(settings);
    });
  });
});
