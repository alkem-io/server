import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
  let logger: Mocked<LoggerService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as Mocked<LoggerService>;
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

  // Regression: auth-reset resilient per-templateDefault containment. A single
  // malformed templateDefault throwing RelationshipNotFoundException must NOT
  // abort the manager cascade; the manager's own inherited auth, the healthy
  // sibling templateDefault, and the templatesSet auth must all survive, and
  // the skip must be logged.
  it('should skip a templateDefault that throws RelationshipNotFoundException and continue', async () => {
    const td1 = { id: 'td-1', authorization: {} } as any;
    const td2 = { id: 'td-2', authorization: {} } as any;
    const templatesSet = { id: 'ts-1', authorization: {} } as any;

    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      authorization: { id: 'tm-auth' },
      templateDefaults: [td1, td2],
      templatesSet,
    } as any);

    templateDefaultAuthorizationService.applyAuthorizationPolicy
      .mockImplementationOnce(() => {
        throw new RelationshipNotFoundException('boom', LogContext.TEMPLATES);
      })
      .mockReturnValueOnce({ id: 'td-2-auth-updated' } as any);
    templatesSetAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'ts-auth-updated' } as any]
    );

    const result = await service.applyAuthorizationPolicy('tm-1', parentAuth);

    // Manager's own inherited auth + healthy sibling + templatesSet auth.
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tm-inherited-auth' }),
        expect.objectContaining({ id: 'td-2-auth-updated' }),
        expect.objectContaining({ id: 'ts-auth-updated' }),
      ])
    );
    // The broken templateDefault contributed nothing.
    expect(result).toHaveLength(3);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  // A data anomaly inside the templatesSet cascade must not deny the manager +
  // its healthy templateDefaults their re-inherited authorization.
  it('should skip the templatesSet cascade when it throws EntityNotFoundException and still return the manager + defaults', async () => {
    const td1 = { id: 'td-1', authorization: {} } as any;
    const td2 = { id: 'td-2', authorization: {} } as any;
    const templatesSet = { id: 'ts-1', authorization: {} } as any;

    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      authorization: { id: 'tm-auth' },
      templateDefaults: [td1, td2],
      templatesSet,
    } as any);

    templateDefaultAuthorizationService.applyAuthorizationPolicy
      .mockReturnValueOnce({ id: 'td-1-auth-updated' } as any)
      .mockReturnValueOnce({ id: 'td-2-auth-updated' } as any);
    templatesSetAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      new EntityNotFoundException('boom', LogContext.TEMPLATES)
    );

    const result = await service.applyAuthorizationPolicy('tm-1', parentAuth);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'tm-inherited-auth' }),
        expect.objectContaining({ id: 'td-1-auth-updated' }),
        expect.objectContaining({ id: 'td-2-auth-updated' }),
      ])
    );
    // Manager + 2 defaults; the templatesSet cascade contributed nothing.
    expect(result).toHaveLength(3);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  // A non-anomaly error must still propagate out of the manager cascade.
  it('should propagate unexpected (non-anomaly) errors from a templateDefault', async () => {
    const td1 = { id: 'td-1', authorization: {} } as any;

    templatesManagerService.getTemplatesManagerOrFail.mockResolvedValue({
      id: 'tm-1',
      authorization: { id: 'tm-auth' },
      templateDefaults: [td1],
      templatesSet: { id: 'ts-1', authorization: {} },
    } as any);

    templateDefaultAuthorizationService.applyAuthorizationPolicy.mockImplementation(
      () => {
        throw new Error('db down');
      }
    );

    await expect(
      service.applyAuthorizationPolicy('tm-1', parentAuth)
    ).rejects.toThrow('db down');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
