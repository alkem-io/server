import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityGuidelinesAuthorizationService } from '@domain/community/community-guidelines/community.guidelines.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceAboutService } from './space.about.service';
import { SpaceAboutAuthorizationService } from './space.about.service.authorization';

describe('SpaceAboutAuthorizationService', () => {
  let service: SpaceAboutAuthorizationService;
  let spaceAboutService: SpaceAboutService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpaceAboutAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SpaceAboutAuthorizationService);
    spaceAboutService = module.get(SpaceAboutService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    communityGuidelinesAuthorizationService = module.get(
      CommunityGuidelinesAuthorizationService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    const createMockSpaceAbout = (overrides: any = {}) => ({
      id: 'about-1',
      authorization: {
        id: 'auth-about-1',
        credentialRules: [],
        privilegeRules: [],
      },
      profile: { id: 'profile-1' },
      guidelines: {
        id: 'guidelines-1',
        profile: { id: 'guidelines-profile-1' },
      },
      ...overrides,
    });

    it('should successfully apply authorization policy', async () => {
      const mockAbout = createMockSpaceAbout();
      const parentAuth = {
        id: 'parent-auth',
        credentialRules: [],
        privilegeRules: [],
      };

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockAbout.authorization as any);
      (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        communityGuidelinesAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(
        'about-1',
        parentAuth as any
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAbout.authorization, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', mockAbout.authorization);
      expect(
        communityGuidelinesAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(mockAbout.guidelines, mockAbout.authorization);
    });

    it('should throw when guidelines are missing', async () => {
      const mockAbout = createMockSpaceAbout({ guidelines: undefined });

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );

      await expect(
        service.applyAuthorizationPolicy('about-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when guidelines profile is missing', async () => {
      const mockAbout = createMockSpaceAbout({
        guidelines: { id: 'guidelines-1', profile: undefined },
      });

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );

      await expect(
        service.applyAuthorizationPolicy('about-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw when profile is missing', async () => {
      const mockAbout = createMockSpaceAbout({ profile: undefined });

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );

      await expect(
        service.applyAuthorizationPolicy('about-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should append credential rules from parent', async () => {
      const mockAbout = createMockSpaceAbout();
      const parentAuth = {
        id: 'parent-auth',
        credentialRules: [],
        privilegeRules: [],
      };
      const credentialRules = [{ cascade: true, grantedPrivileges: ['READ'] }];

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockAbout.authorization as any);
      (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        communityGuidelinesAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy(
        'about-1',
        parentAuth as any,
        credentialRules as any
      );

      expect(mockAbout.authorization.credentialRules).toContainEqual(
        credentialRules[0]
      );
    });

    it('should work with undefined parent authorization', async () => {
      const mockAbout = createMockSpaceAbout();

      (spaceAboutService.getSpaceAboutOrFail as any).mockResolvedValue(
        mockAbout as any
      );
      (
        authorizationPolicyService.inheritParentAuthorization as any
      ).mockReturnValue(mockAbout.authorization as any);
      (
        profileAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);
      (
        communityGuidelinesAuthorizationService.applyAuthorizationPolicy as any
      ).mockResolvedValue([]);

      const result = await service.applyAuthorizationPolicy(
        'about-1',
        undefined
      );

      expect(result).toBeDefined();
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mockAbout.authorization, undefined);
    });
  });
});
