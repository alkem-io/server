import { AuthorizationService } from '@core/authorization/authorization.service';
import { vi } from 'vitest';
import { TemplateContentSpaceResolverMutations } from './template.content.space.resolver.mutations';
import { TemplateContentSpaceService } from './template.content.space.service';

describe('TemplateContentSpaceResolverMutations', () => {
  let resolver: TemplateContentSpaceResolverMutations;
  let authorizationService: {
    grantAccessOrFail: ReturnType<typeof vi.fn>;
  };
  let templateContentSpaceService: {
    getTemplateContentSpaceOrFail: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authorizationService = {
      grantAccessOrFail: vi.fn(),
    };
    templateContentSpaceService = {
      getTemplateContentSpaceOrFail: vi.fn(),
      update: vi.fn(),
    };
    resolver = new TemplateContentSpaceResolverMutations(
      authorizationService as unknown as AuthorizationService,
      templateContentSpaceService as unknown as TemplateContentSpaceService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateTemplateContentSpace', () => {
    it('should check authorization and delegate to service', async () => {
      const tcs = { id: 'tcs-1', authorization: { id: 'auth-1' } };
      templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
        tcs
      );

      const updatedTcs = { id: 'tcs-1', about: { displayName: 'updated' } };
      templateContentSpaceService.update.mockResolvedValue(updatedTcs);

      const actorContext = { actorID: 'user-1' } as any;
      const updateInput = { ID: 'tcs-1', about: { displayName: 'updated' } };

      const result = await resolver.updateTemplateContentSpace(
        actorContext,
        updateInput as any
      );

      expect(
        templateContentSpaceService.getTemplateContentSpaceOrFail
      ).toHaveBeenCalledWith('tcs-1', expect.anything());
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(templateContentSpaceService.update).toHaveBeenCalledWith(
        updateInput
      );
      expect(result).toBe(updatedTcs);
    });
  });
});
