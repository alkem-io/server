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

  beforeEach(() => {
    resolver = new TemplateResolverMutations(
      {
        grantAccessOrFail: vi.fn(),
      } as unknown as AuthorizationService,
      {
        saveAll: vi.fn(),
      } as unknown as AuthorizationPolicyService,
      {
        getSpaceOrFail: vi.fn(),
      } as unknown as SpaceLookupService,
      {
        applyAuthorizationPolicy: vi.fn(),
      } as unknown as TemplateAuthorizationService,
      {
        getTemplateOrFail: vi.fn(),
        updateTemplate: vi.fn(),
        updateTemplateFromSpace: vi.fn(),
        delete: vi.fn(),
        isTemplateInUseInTemplateDefault: vi.fn(),
      } as unknown as TemplateService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
