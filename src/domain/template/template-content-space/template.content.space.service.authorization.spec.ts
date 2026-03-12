import { RelationshipNotFoundException } from '@common/exceptions';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceAboutAuthorizationService } from '@domain/space/space.about/space.about.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateContentSpaceService } from './template.content.space.service';
import { TemplateContentSpaceAuthorizationService } from './template.content.space.service.authorization';

describe('TemplateContentSpaceAuthorizationService', () => {
  let service: TemplateContentSpaceAuthorizationService;
  let templateContentSpaceService: Mocked<TemplateContentSpaceService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let collaborationAuthorizationService: Mocked<CollaborationAuthorizationService>;
  let spaceAboutAuthorizationService: Mocked<SpaceAboutAuthorizationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateContentSpaceAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateContentSpaceAuthorizationService);
    templateContentSpaceService = module.get(
      TemplateContentSpaceService
    ) as Mocked<TemplateContentSpaceService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    collaborationAuthorizationService = module.get(
      CollaborationAuthorizationService
    ) as Mocked<CollaborationAuthorizationService>;
    spaceAboutAuthorizationService = module.get(
      SpaceAboutAuthorizationService
    ) as Mocked<SpaceAboutAuthorizationService>;
  });

  const parentAuth = { id: 'parent-auth' } as any;

  beforeEach(() => {
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
      id: 'inherited-auth',
    } as any);
    collaborationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'collab-auth' } as any]
    );
    spaceAboutAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'about-auth' } as any,
    ]);
  });

  it('should throw RelationshipNotFoundException when required relations are missing', async () => {
    templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
      {
        id: 'tcs-1',
        authorization: undefined,
        collaboration: { id: 'collab-1' },
        about: { id: 'about-1', profile: {} },
        subspaces: [],
      } as any
    );

    await expect(
      service.applyAuthorizationPolicy('tcs-1', parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should inherit parent authorization and cascade to collaboration and about', async () => {
    templateContentSpaceService.getTemplateContentSpaceOrFail.mockResolvedValue(
      {
        id: 'tcs-1',
        authorization: { id: 'tcs-auth' },
        collaboration: { id: 'collab-1' },
        about: { id: 'about-1', profile: {} },
        subspaces: [],
      } as any
    );

    const result = await service.applyAuthorizationPolicy('tcs-1', parentAuth);

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalled();
    expect(
      collaborationAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalled();
    expect(
      spaceAboutAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('about-1', expect.anything());
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should recursively apply authorization to subspaces', async () => {
    // First call returns parent with subspace
    templateContentSpaceService.getTemplateContentSpaceOrFail
      .mockResolvedValueOnce({
        id: 'parent-1',
        authorization: { id: 'parent-auth' },
        collaboration: { id: 'collab-parent' },
        about: { id: 'about-parent', profile: {} },
        subspaces: [{ id: 'sub-1' }],
      } as any)
      // Second call returns the subspace
      .mockResolvedValueOnce({
        id: 'sub-1',
        authorization: { id: 'sub-auth' },
        collaboration: { id: 'collab-sub' },
        about: { id: 'about-sub', profile: {} },
        subspaces: [],
      } as any);

    const result = await service.applyAuthorizationPolicy(
      'parent-1',
      parentAuth
    );

    expect(
      templateContentSpaceService.getTemplateContentSpaceOrFail
    ).toHaveBeenCalledTimes(2);
    expect(result.length).toBeGreaterThanOrEqual(6); // 3 for parent + 3 for subspace
  });
});
