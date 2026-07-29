import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { LoggerService } from '@nestjs/common';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { TemplateService } from '../template/template.service';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { TemplatesSetResolverMutations } from './templates.set.resolver.mutations';
import { TemplatesSetService } from './templates.set.service';

describe('TemplatesSetResolverMutations', () => {
  let resolver: TemplatesSetResolverMutations;
  let authorizationService: {
    grantAccessOrFail: ReturnType<typeof vi.fn>;
    isAccessGranted: ReturnType<typeof vi.fn>;
  };
  let authorizationPolicyService: { saveAll: ReturnType<typeof vi.fn> };
  let templatesSetService: {
    getTemplatesSetOrFail: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
    createTemplateFromSpace: ReturnType<typeof vi.fn>;
    createTemplateFromContentSpace: ReturnType<typeof vi.fn>;
  };
  let templateAuthorizationService: {
    applyAuthorizationPolicy: ReturnType<typeof vi.fn>;
  };
  let templateService: { getTemplateOrFail: ReturnType<typeof vi.fn> };
  let spaceLookupService: { getSpaceOrFail: ReturnType<typeof vi.fn> };
  let templateContentSpaceService: {
    getTemplateContentSpaceOrFail: ReturnType<typeof vi.fn>;
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
    templatesSetService = {
      getTemplatesSetOrFail: vi.fn(),
      createTemplate: vi.fn(),
      createTemplateFromSpace: vi.fn(),
      createTemplateFromContentSpace: vi.fn(),
    };
    templateAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
    templateService = { getTemplateOrFail: vi.fn() };
    spaceLookupService = { getSpaceOrFail: vi.fn() };
    templateContentSpaceService = { getTemplateContentSpaceOrFail: vi.fn() };

    resolver = new TemplatesSetResolverMutations(
      authorizationService as unknown as AuthorizationService,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
      templatesSetService as unknown as TemplatesSetService,
      templateAuthorizationService as unknown as TemplateAuthorizationService,
      templateService as unknown as TemplateService,
      spaceLookupService as unknown as SpaceLookupService,
      templateContentSpaceService as unknown as TemplateContentSpaceService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should check authorization, create template, apply auth policy, and return result', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplate.mockResolvedValue(template);
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = { templatesSetID: 'ts-1' } as any;

      const result = await resolver.createTemplate(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(templatesSetService.createTemplate).toHaveBeenCalledWith(
        templatesSet,
        templateData
      );
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
      expect(result).toBe(template);
      // spec-server-9 fix: A7's dual path is CREATE ∨
      // PLATFORM_SUPPORT_ORG_RESOURCES — assert the actual gate.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        templatesSet.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        templatesSet.authorization,
        AuthorizationPrivilege.CREATE,
        expect.any(String)
      );
    });
  });

  describe('createTemplateFromSpace', () => {
    it('should check both template set and space authorization', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const space = { id: 'space-1', authorization: { id: 'space-auth' } };
      spaceLookupService.getSpaceOrFail.mockResolvedValue(space);

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplateFromSpace.mockResolvedValue(template);
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = {
        templatesSetID: 'ts-1',
        spaceID: 'space-1',
      } as any;

      await resolver.createTemplateFromSpace(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
      expect(templatesSetService.createTemplateFromSpace).toHaveBeenCalledWith(
        templatesSet,
        templateData
      );
      // spec-server-9 fix: same A7 dual path on the templates-set, plus a
      // bare READ check on the source space.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        templatesSet.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        templatesSet.authorization,
        AuthorizationPrivilege.CREATE,
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

  describe('createTemplateFromContentSpace', () => {
    it('should check both template set and content space authorization', async () => {
      const templatesSet = { id: 'ts-1', authorization: { id: 'ts-auth' } };
      templatesSetService.getTemplatesSetOrFail.mockResolvedValue(templatesSet);

      const contentSpace = {
        id: 'tcs-1',
        authorization: { id: 'tcs-auth' },
      };
      templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
        contentSpace
      );

      const template = { id: 'tpl-1' };
      templatesSetService.createTemplateFromContentSpace.mockResolvedValue(
        template
      );
      templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      templateService.getTemplateOrFail.mockResolvedValue(template);

      const actorContext = { actorID: 'user-1' } as any;
      const templateData = {
        templatesSetID: 'ts-1',
        contentSpaceID: 'tcs-1',
      } as any;

      await resolver.createTemplateFromContentSpace(actorContext, templateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(2);
      expect(
        templatesSetService.createTemplateFromContentSpace
      ).toHaveBeenCalledWith(templatesSet, templateData);
      // spec-server-9 fix — see createTemplateFromSpace above.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        templatesSet.authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        contentSpace.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
    });
  });
});
