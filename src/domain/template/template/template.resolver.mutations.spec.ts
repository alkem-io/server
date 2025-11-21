import { LoggerService } from '@nestjs/common';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { TemplateAuthorizationService } from './template.service.authorization';
import { TemplateResolverMutations } from './template.resolver.mutations';
import { TemplateService } from './template.service';

describe('TemplateResolverMutations', () => {
  let resolver: TemplateResolverMutations;

  beforeEach(() => {
    resolver = new TemplateResolverMutations(
      {
        grantAccessOrFail: jest.fn(),
      } as unknown as AuthorizationService,
      {
        saveAll: jest.fn(),
      } as unknown as AuthorizationPolicyService,
      {
        getSpaceOrFail: jest.fn(),
      } as unknown as SpaceLookupService,
      {
        applyAuthorizationPolicy: jest.fn(),
      } as unknown as TemplateAuthorizationService,
      {
        getTemplateOrFail: jest.fn(),
        updateTemplate: jest.fn(),
        updateTemplateFromSpace: jest.fn(),
        delete: jest.fn(),
        isTemplateInUseInTemplateDefault: jest.fn(),
      } as unknown as TemplateService,
      MockWinstonProvider.useValue as unknown as LoggerService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
