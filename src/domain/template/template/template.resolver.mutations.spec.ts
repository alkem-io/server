import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ValidationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { LoggerService } from '@nestjs/common';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { TemplateResolverMutations } from './template.resolver.mutations';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';

describe('TemplateResolverMutations', () => {
  let resolver: TemplateResolverMutations;
  let authorizationService: {
    grantAccessOrFail: ReturnType<typeof vi.fn>;
    isAccessGranted: ReturnType<typeof vi.fn>;
  };
  let authorizationPolicyService: { saveAll: ReturnType<typeof vi.fn> };
  let spaceLookupService: { getSpaceOrFail: ReturnType<typeof vi.fn> };
  let templateAuthorizationService: {
    applyAuthorizationPolicy: ReturnType<typeof vi.fn>;
  };
  let templateService: {
    getTemplateOrFail: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
    updateTemplateFromSpace: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    isTemplateInUseInTemplateDefault: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authorizationService = {
      grantAccessOrFail: vi.fn(),
      // 027-platform-role-redesign (T042): dual-path checks call
      // isAccessGranted before falling through to grantAccessOrFail;
      // default false so grantAccessOrFail's own call assertions hold.
      isAccessGranted: vi.fn().mockReturnValue(false),
    };
    authorizationPolicyService = { saveAll: vi.fn() };
    spaceLookupService = { getSpaceOrFail: vi.fn() };
    templateAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
    templateService = {
      getTemplateOrFail: vi.fn(),
      updateTemplate: vi.fn(),
      updateTemplateFromSpace: vi.fn(),
      delete: vi.fn(),
      isTemplateInUseInTemplateDefault: vi.fn(),
    };

    resolver = new TemplateResolverMutations(
      authorizationService as unknown as AuthorizationService,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
      spaceLookupService as unknown as SpaceLookupService,
      templateAuthorizationService as unknown as TemplateAuthorizationService,
      templateService as unknown as TemplateService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateTemplate', () => {
    it('should check authorization and delegate to service', async () => {
      const template = {
        id: 'tpl-1',
        authorization: { id: 'tpl-auth' },
        profile: {},
      };
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const updatedTemplate = { id: 'tpl-1', profile: { displayName: 'new' } };
      templateService.updateTemplate.mockResolvedValue(updatedTemplate);

      const actorContext = { actorID: 'user-1' } as any;
      const updateData = { ID: 'tpl-1', profile: { displayName: 'new' } };

      const result = await resolver.updateTemplate(
        actorContext,
        updateData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(templateService.updateTemplate).toHaveBeenCalledWith(
        template,
        updateData
      );
      expect(result).toBe(updatedTemplate);
      // spec-server-9 fix: A7's dual path is UPDATE ∨
      // PLATFORM_SUPPORT_ORG_RESOURCES — assert the actual gate.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
    });
  });

  describe('updateTemplateFromSpace', () => {
    it('should check both template and space authorization and delegate to service', async () => {
      const template = {
        id: 'tpl-1',
        authorization: { id: 'tpl-auth' },
        templatesSet: { authorization: { id: 'ts-auth' } },
      };
      templateService.getTemplateOrFail
        .mockResolvedValueOnce(template)
        .mockResolvedValueOnce(template);

      const space = { id: 'space-1', authorization: { id: 'space-auth' } };
      spaceLookupService.getSpaceOrFail.mockResolvedValue(space);

      const updatedTemplate = { id: 'tpl-1' };
      templateService.updateTemplateFromSpace.mockResolvedValue(
        updatedTemplate
      );
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );

      const actorContext = { actorID: 'user-1' } as any;
      const updateData = { templateID: 'tpl-1', spaceID: 'space-1' };

      await resolver.updateTemplateFromSpace(actorContext, updateData as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
      expect(templateService.updateTemplateFromSpace).toHaveBeenCalled();
      expect(
        templateAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
      // spec-server-9 fix: same A7 dual path on the template, plus a bare
      // READ check on the source space.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should check authorization and delete template', async () => {
      const template = {
        id: 'tpl-1',
        authorization: { id: 'tpl-auth' },
        profile: {},
      };
      templateService.getTemplateOrFail.mockResolvedValue(template);
      templateService.isTemplateInUseInTemplateDefault.mockResolvedValue(false);

      const deletedTemplate = { id: 'tpl-1' };
      templateService.delete.mockResolvedValue(deletedTemplate);

      const actorContext = { actorID: 'user-1' } as any;
      const deleteData = { ID: 'tpl-1' };

      const result = await resolver.deleteTemplate(
        actorContext,
        deleteData as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(
        templateService.isTemplateInUseInTemplateDefault
      ).toHaveBeenCalledWith('tpl-1');
      expect(templateService.delete).toHaveBeenCalledWith(template);
      expect(result).toBe(deletedTemplate);
      // spec-server-9 fix: deleteTemplate's dual path is DELETE ∨
      // PLATFORM_SUPPORT_ORG_RESOURCES.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        template.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
    });

    it('should throw ValidationException when template is in use', async () => {
      const template = {
        id: 'tpl-1',
        authorization: { id: 'tpl-auth' },
        profile: {},
      };
      templateService.getTemplateOrFail.mockResolvedValue(template);
      templateService.isTemplateInUseInTemplateDefault.mockResolvedValue(true);

      const actorContext = { actorID: 'user-1' } as any;
      const deleteData = { ID: 'tpl-1' };

      await expect(
        resolver.deleteTemplate(actorContext, deleteData as any)
      ).rejects.toThrow(ValidationException);
    });
  });
});
