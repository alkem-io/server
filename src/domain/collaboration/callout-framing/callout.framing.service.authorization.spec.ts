import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MediaGalleryAuthorizationService } from '@domain/common/media-gallery/media.gallery.service.authorization';
import { MemoAuthorizationService } from '@domain/common/memo/memo.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutFramingService } from './callout.framing.service';
import { CalloutFramingAuthorizationService } from './callout.framing.service.authorization';

describe('CalloutFramingAuthorizationService', () => {
  let service: CalloutFramingAuthorizationService;
  let calloutFramingService: CalloutFramingService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let whiteboardAuthorizationService: WhiteboardAuthorizationService;
  let memoAuthorizationService: MemoAuthorizationService;
  let mediaGalleryAuthorizationService: MediaGalleryAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutFramingAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutFramingAuthorizationService);
    calloutFramingService = module.get(CalloutFramingService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    whiteboardAuthorizationService = module.get(WhiteboardAuthorizationService);
    memoAuthorizationService = module.get(MemoAuthorizationService);
    mediaGalleryAuthorizationService = module.get(
      MediaGalleryAuthorizationService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    const parentAuth = { id: 'auth-parent' } as any;

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const framing = {
        id: 'framing-1',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);

      await expect(
        service.applyAuthorizationPolicy({ id: 'framing-1' } as any, parentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should inherit parent authorization and propagate to profile', async () => {
      const framingAuth = { id: 'auth-framing', credentialRules: [] } as any;
      const inheritedAuth = { id: 'auth-inherited' } as any;
      const framing = {
        id: 'framing-1',
        profile: { id: 'profile-1' },
        authorization: framingAuth,
        whiteboard: undefined,
        memo: undefined,
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        parentAuth
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(framingAuth, parentAuth);
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', inheritedAuth);
      expect(result.length).toBe(2);
    });

    it('should propagate to whiteboard when present', async () => {
      const inheritedAuth = { id: 'auth-inherited' } as any;
      const framing = {
        id: 'framing-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-framing' },
        whiteboard: { id: 'wb-1' },
        memo: undefined,
        mediaGallery: undefined,
      } as any;
      const spaceSettings = { collaboration: {} } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-wb' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        parentAuth,
        spaceSettings
      );

      expect(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('wb-1', inheritedAuth, spaceSettings);
      expect(result.length).toBe(2);
    });

    it('should propagate to memo when present', async () => {
      const inheritedAuth = { id: 'auth-inherited' } as any;
      const framing = {
        id: 'framing-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-framing' },
        whiteboard: undefined,
        memo: { id: 'memo-1' },
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        memoAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-memo' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        parentAuth
      );

      expect(
        memoAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('memo-1', inheritedAuth);
      expect(result.length).toBe(2);
    });

    it('should propagate to media gallery when present', async () => {
      const inheritedAuth = { id: 'auth-inherited' } as any;
      const framing = {
        id: 'framing-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-framing' },
        whiteboard: undefined,
        memo: undefined,
        mediaGallery: { id: 'mg-1', storageBucket: { id: 'sb-1' } },
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(inheritedAuth);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        mediaGalleryAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-mg' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        parentAuth
      );

      expect(
        mediaGalleryAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('mg-1', inheritedAuth);
      expect(result.length).toBe(2);
    });
  });
});
