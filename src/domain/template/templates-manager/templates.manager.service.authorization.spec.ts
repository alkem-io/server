import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateDefaultAuthorizationService } from '../template-default/template.default.service.authorization';
import { TemplatesSetAuthorizationService } from '../templates-set/templates.set.service.authorization';
import { TemplatesManagerService } from './templates.manager.service';
import { TemplatesManagerAuthorizationService } from './templates.manager.service.authorization';

describe('TemplatesManagerAuthorizationService', () => {
  let service: TemplatesManagerAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let templatesManagerService: Mocked<TemplatesManagerService>;
  let templateDefaultAuthorizationService: Mocked<TemplateDefaultAuthorizationService>;
  let templatesSetAuthorizationService: Mocked<TemplatesSetAuthorizationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesManagerAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplatesManagerAuthorizationService);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    templatesManagerService = module.get(
      TemplatesManagerService
    ) as Mocked<TemplatesManagerService>;
    templateDefaultAuthorizationService = module.get(
      TemplateDefaultAuthorizationService
    ) as Mocked<TemplateDefaultAuthorizationService>;
    templatesSetAuthorizationService = module.get(
      TemplatesSetAuthorizationService
    ) as Mocked<TemplatesSetAuthorizationService>;
  });

  const parentAuth = { id: 'parent-auth' } as any;

  beforeEach(() => {
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
      id: 'tm-inherited-auth',
    } as any);
  });

  it('should throw RelationshipNotFoundException when required relations are missing', async () => {
    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      templatesSet: undefined,
      templateDefaults: undefined,
    } as any);

    await expect(
      service.applyAuthorizationPolicy('tm-1', parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should inherit parent authorization and cascade to defaults and templates set', async () => {
    const td1 = { id: 'td-1', authorization: {} } as any;
    const td2 = { id: 'td-2', authorization: {} } as any;
    const templatesSet = { id: 'ts-1', authorization: {} } as any;

    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      authorization: { id: 'tm-auth' },
      templateDefaults: [td1, td2],
      templatesSet,
    } as any);

    templateDefaultAuthorizationService.applyAuthorizationPolicy.mockReturnValue(
      { id: 'td-auth-updated' } as any
    );
    templatesSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'ts-auth-updated' } as any]
    );

    const result = await service.applyAuthorizationPolicy('tm-1', parentAuth);

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalled();
    expect(
      templateDefaultAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledTimes(2);
    expect(
      templatesSetAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(templatesSet, parentAuth);
    // 1 manager + 2 defaults + 1 templates set
    expect(result.length).toBe(4);
  });

  it('should handle empty template defaults', async () => {
    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      authorization: { id: 'tm-auth' },
      templateDefaults: [],
      templatesSet: { id: 'ts-1', authorization: {} },
    } as any);

    templatesSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'ts-auth' } as any]
    );

    const result = await service.applyAuthorizationPolicy('tm-1', parentAuth);

    expect(
      templateDefaultAuthorizationService.applyAuthorizationPolicy
    ).not.toHaveBeenCalled();
    expect(result.length).toBe(2); // 1 manager + 1 templates set
  });
});
