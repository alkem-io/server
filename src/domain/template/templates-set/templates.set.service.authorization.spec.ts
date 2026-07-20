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
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { ITemplatesSet } from './templates.set.interface';
import { TemplatesSetService } from './templates.set.service';
import { TemplatesSetAuthorizationService } from './templates.set.service.authorization';

describe('TemplatesSetAuthorizationService', () => {
  let service: TemplatesSetAuthorizationService;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let templatesSetService: Mocked<TemplatesSetService>;
  let templateAuthorizationService: Mocked<TemplateAuthorizationService>;
  let logger: Mocked<LoggerService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as Mocked<LoggerService>;
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

  // Regression: auth-reset resilient per-template containment. A single orphan
  // template (e.g. type='whiteboard' with whiteboardId=NULL) throwing
  // RelationshipNotFoundException must NOT abort the whole templatesSet cascade;
  // healthy siblings + the templatesSet's own inherited auth must still be
  // returned and the skip must be logged.
  it('should skip a template that throws RelationshipNotFoundException and continue with healthy siblings', async () => {
    const template1 = { id: 'tpl-1' } as any;
    const template2 = { id: 'tpl-2' } as any;

    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: [template1, template2],
    } as any);

    templateAuthorizationService.applyAuthorizationPolicy
      .mockRejectedValueOnce(
        new RelationshipNotFoundException('boom', LogContext.TEMPLATES)
      )
      .mockResolvedValueOnce([{ id: 'tpl-2-auth' } as any]);

    const result = await service.applyAuthorizationPolicy(
      { id: 'ts-1' } as ITemplatesSet,
      parentAuth
    );

    // The healthy sibling + the templatesSet's own inherited auth are present.
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ts-inherited-auth' }),
        expect.objectContaining({ id: 'tpl-2-auth' }),
      ])
    );
    // The broken template contributed nothing.
    expect(result).toHaveLength(2);
    // The skip was logged exactly once.
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  // Same guarantee for the default:-branch anomaly (unknown template.type)
  // which surfaces as EntityNotFoundException.
  it('should skip a template that throws EntityNotFoundException and continue with healthy siblings', async () => {
    const template1 = { id: 'tpl-1' } as any;
    const template2 = { id: 'tpl-2' } as any;

    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: [template1, template2],
    } as any);

    templateAuthorizationService.applyAuthorizationPolicy
      .mockRejectedValueOnce(
        new EntityNotFoundException('boom', LogContext.TEMPLATES)
      )
      .mockResolvedValueOnce([{ id: 'tpl-2-auth' } as any]);

    const result = await service.applyAuthorizationPolicy(
      { id: 'ts-1' } as ITemplatesSet,
      parentAuth
    );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ts-inherited-auth' }),
        expect.objectContaining({ id: 'tpl-2-auth' }),
      ])
    );
    expect(result).toHaveLength(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  // A non-anomaly error (e.g. a DB outage) must still propagate — resilience is
  // scoped strictly to data-integrity anomalies.
  it('should propagate unexpected (non-anomaly) errors', async () => {
    const template1 = { id: 'tpl-1' } as any;

    templatesSetService.getTemplatesSetOrFail.mockResolvedValue({
      id: 'ts-1',
      authorization: { id: 'ts-auth' },
      templates: [template1],
    } as any);

    templateAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      new Error('db down')
    );

    await expect(
      service.applyAuthorizationPolicy(
        { id: 'ts-1' } as ITemplatesSet,
        parentAuth
      )
    ).rejects.toThrow('db down');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
