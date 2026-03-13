import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { CalloutAuthorizationService } from '@domain/collaboration/callout/callout.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { TemplateContentSpaceAuthorizationService } from '../template-content-space/template.content.space.service.authorization';
import { ITemplate } from './template.interface';
import { TemplateService } from './template.service';
import { TemplateAuthorizationService } from './template.service.authorization';

describe('TemplateAuthorizationService', () => {
  let service: TemplateAuthorizationService;
  let templateService: Mocked<TemplateService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let profileAuthorizationService: Mocked<ProfileAuthorizationService>;
  let communityGuidelinesAuthorizationService: Mocked<CommunityGuidelinesAuthorizationService>;
  let calloutAuthorizationService: Mocked<CalloutAuthorizationService>;
  let whiteboardAuthorizationService: Mocked<WhiteboardAuthorizationService>;
  let templateContentSpaceAuthorizationService: Mocked<TemplateContentSpaceAuthorizationService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemplateAuthorizationService);
    templateService = module.get(TemplateService) as Mocked<TemplateService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    profileAuthorizationService = module.get(
      ProfileAuthorizationService
    ) as Mocked<ProfileAuthorizationService>;
    communityGuidelinesAuthorizationService = module.get(
      CommunityGuidelinesAuthorizationService
    ) as Mocked<CommunityGuidelinesAuthorizationService>;
    calloutAuthorizationService = module.get(
      CalloutAuthorizationService
    ) as Mocked<CalloutAuthorizationService>;
    whiteboardAuthorizationService = module.get(
      WhiteboardAuthorizationService
    ) as Mocked<WhiteboardAuthorizationService>;
    templateContentSpaceAuthorizationService = module.get(
      TemplateContentSpaceAuthorizationService
    ) as Mocked<TemplateContentSpaceAuthorizationService>;
  });

  const parentAuth = { id: 'parent-auth' } as any;

  const makeTemplate = (
    type: TemplateType,
    overrides: Record<string, any> = {}
  ) => ({
    id: 'tpl-1',
    type,
    authorization: { id: 'tpl-auth' },
    profile: { id: 'profile-1' },
    ...overrides,
  });

  beforeEach(() => {
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
      id: 'inherited-auth',
    } as any);
    profileAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'profile-auth' } as any,
    ]);
  });

  it('should throw RelationshipNotFoundException when profile is missing', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.POST, { profile: undefined }) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should inherit parent authorization and cascade to profile for POST template', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.POST) as any
    );

    const result = await service.applyAuthorizationPolicy(
      { id: 'tpl-1' } as ITemplate,
      parentAuth
    );

    expect(
      authorizationPolicyService.inheritParentAuthorization
    ).toHaveBeenCalled();
    expect(
      profileAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('profile-1', expect.anything());
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('should cascade to community guidelines for COMMUNITY_GUIDELINES template', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.COMMUNITY_GUIDELINES, {
        communityGuidelines: { id: 'cg-1', profile: {} },
      }) as any
    );
    communityGuidelinesAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'cg-auth' } as any]
    );

    const result = await service.applyAuthorizationPolicy(
      { id: 'tpl-1' } as ITemplate,
      parentAuth
    );

    expect(
      communityGuidelinesAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'cg-auth' })])
    );
  });

  it('should throw RelationshipNotFoundException for COMMUNITY_GUIDELINES when guidelines are missing', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.COMMUNITY_GUIDELINES, {
        communityGuidelines: undefined,
      }) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should cascade to callout for CALLOUT template', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.CALLOUT, {
        callout: {
          id: 'co-1',
          framing: { profile: {}, whiteboard: { profile: {} } },
          contributionDefaults: {},
        },
      }) as any
    );
    calloutAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'callout-auth' } as any,
    ]);

    const result = await service.applyAuthorizationPolicy(
      { id: 'tpl-1' } as ITemplate,
      parentAuth
    );

    expect(
      calloutAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('co-1', expect.anything(), { roles: [] });
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'callout-auth' })])
    );
  });

  it('should throw RelationshipNotFoundException for CALLOUT when callout is missing', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.CALLOUT, { callout: undefined }) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should cascade to whiteboard for WHITEBOARD template', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.WHITEBOARD, {
        whiteboard: { id: 'wb-1' },
      }) as any
    );
    whiteboardAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([
      { id: 'wb-auth' } as any,
    ]);

    const result = await service.applyAuthorizationPolicy(
      { id: 'tpl-1' } as ITemplate,
      parentAuth
    );

    expect(
      whiteboardAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('wb-1', expect.anything());
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'wb-auth' })])
    );
  });

  it('should throw RelationshipNotFoundException for WHITEBOARD when whiteboard is missing', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.WHITEBOARD, { whiteboard: undefined }) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should cascade to content space for SPACE template', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.SPACE, {
        contentSpace: { id: 'tcs-1', authorization: {} },
      }) as any
    );
    templateContentSpaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      [{ id: 'tcs-auth' } as any]
    );

    const result = await service.applyAuthorizationPolicy(
      { id: 'tpl-1' } as ITemplate,
      parentAuth
    );

    expect(
      templateContentSpaceAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('tcs-1', expect.anything());
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'tcs-auth' })])
    );
  });

  it('should throw RelationshipNotFoundException for SPACE when contentSpace is missing', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate(TemplateType.SPACE, { contentSpace: undefined }) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(RelationshipNotFoundException);
  });

  it('should throw EntityNotFoundException for unknown template type', async () => {
    templateService.getTemplateOrFail.mockResolvedValue(
      makeTemplate('unknown' as TemplateType) as any
    );

    await expect(
      service.applyAuthorizationPolicy({ id: 'tpl-1' } as ITemplate, parentAuth)
    ).rejects.toThrow(EntityNotFoundException);
  });
});
