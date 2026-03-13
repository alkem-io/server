import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { ITemplateDefault } from './template.default.interface';
import { TemplateDefaultAuthorizationService } from './template.default.service.authorization';

describe('TemplateDefaultAuthorizationService', () => {
  let service: TemplateDefaultAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateDefaultAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateDefaultAuthorizationService);
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
  });

  it('should inherit parent authorization and return the updated policy', () => {
    const inheritedAuth = { id: 'inherited-auth' } as any;
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
      inheritedAuth
    );

    const templateDefault = {
      id: 'td-1',
      authorization: { id: 'td-auth' },
    } as unknown as ITemplateDefault;

    const parentAuth = { id: 'parent-auth' } as any;

    const result = service.applyAuthorizationPolicy(
      templateDefault,
      parentAuth
    );

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalledWith({ id: 'td-auth' }, parentAuth);
    expect(result).toBe(inheritedAuth);
    expect(templateDefault.authorization).toBe(inheritedAuth);
  });

  it('should handle undefined parent authorization', () => {
    const inheritedAuth = { id: 'inherited-auth' } as any;
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue(
      inheritedAuth
    );

    const templateDefault = {
      id: 'td-1',
      authorization: { id: 'td-auth' },
    } as unknown as ITemplateDefault;

    const result = service.applyAuthorizationPolicy(templateDefault, undefined);

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalledWith({ id: 'td-auth' }, undefined);
    expect(result).toBe(inheritedAuth);
  });
});
