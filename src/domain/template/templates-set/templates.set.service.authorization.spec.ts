import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';

describe('TemplatesSetAuthorizationService', () => {
  let service: TemplatesSetAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let templatesSetService: Mocked<TemplatesSetService>;
  let templateAuthorizationService: Mocked<TemplateAuthorizationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesSetAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplatesSetAuthorizationService);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    templatesSetService = module.get(
      TemplatesSetService
    ) as Mocked<TemplatesSetService>;
    templateAuthorizationService = module.get(
      TemplateAuthorizationService
    ) as Mocked<TemplateAuthorizationService>;
  });

  const parentAuth = { id: 'parent-auth' } as any;

  beforeEach(() => {
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
      id: 'ts-inherited-auth',
    } as any);
  });

  it('should inherit parent authorization and return updated policies', async () => {
    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: [],
    } as any);

    const result = await service.applyAuthorizationPolicy(
      { id: 'ts-1' } as ITemplatesSet,
      parentAuth
    );

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ts-inherited-auth' }),
      ])
    );
  });

  it('should cascade authorization to each template using templatesSet authorization', async () => {
    const template1 = { id: 'tpl-1' } as any;
    const template2 = { id: 'tpl-2' } as any;

    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: [template1, template2],
    } as any);

    templateAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'tpl-auth' } as any,
    ]);

    const result = await service.applyAuthorizationPolicy(
      { id: 'ts-1' } as ITemplatesSet,
      parentAuth
    );

    expect(
      templateAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledTimes(2);
    // Templates should inherit from templatesSet authorization, not parent
    expect(
      templateAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith(
      template1,
      expect.objectContaining({ id: 'ts-inherited-auth' })
    );
    expect(result.length).toBe(3); // 1 templatesSet + 2 templates
  });

  it('should not cascade when templates array is undefined', async () => {
    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: undefined,
    } as any);

    const result = await service.applyAuthorizationPolicy(
      { id: 'ts-1' } as ITemplatesSet,
      parentAuth
    );

    expect(
      templateAuthorizationService.applyAuthorizationPolicy
    ).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
