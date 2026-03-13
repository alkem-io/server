import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should apply authorization to framing and profile', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: { id: 'profile-1' },
        whiteboard: undefined,
        memo: undefined,
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        { id: 'parent-auth' } as any
      );

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalled();
      expect(
        profileAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('profile-1', framing.authorization);
      // framing auth + profile auth
      expect(result.length).toBe(2);
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: undefined,
        whiteboard: undefined,
        memo: undefined,
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);

      await expect(
        service.applyAuthorizationPolicy({ id: 'framing-1' } as any, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should apply whiteboard authorization when whiteboard exists', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
        memo: undefined,
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-wb' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        { id: 'parent-auth' } as any
      );

      expect(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('wb-1', framing.authorization, undefined);
      expect(result.length).toBe(3);
    });

    it('should apply memo authorization when memo exists', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: { id: 'profile-1' },
        whiteboard: undefined,
        memo: { id: 'memo-1' },
        mediaGallery: undefined,
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        memoAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-memo' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        { id: 'parent-auth' } as any
      );

      expect(
        memoAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('memo-1', framing.authorization);
      expect(result.length).toBe(3);
    });

    it('should apply media gallery authorization when media gallery exists', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: { id: 'profile-1' },
        whiteboard: undefined,
        memo: undefined,
        mediaGallery: { id: 'mg-1', storageBucket: { id: 'sb-1' } },
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        mediaGalleryAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-mg' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        { id: 'parent-auth' } as any
      );

      expect(
        mediaGalleryAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith('mg-1', framing.authorization);
      expect(result.length).toBe(3);
    });

    it('should apply all child authorizations when all exist', async () => {
      const framing = {
        id: 'framing-1',
        authorization: { id: 'auth-framing' },
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
        memo: { id: 'memo-1' },
        mediaGallery: { id: 'mg-1', storageBucket: { id: 'sb-1' } },
      } as any;

      vi.mocked(
        calloutFramingService.getCalloutFramingOrFail
      ).mockResolvedValue(framing);
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockReturnValue(framing.authorization);
      vi.mocked(
        profileAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-profile' }] as any);
      vi.mocked(
        whiteboardAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-wb' }] as any);
      vi.mocked(
        memoAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-memo' }] as any);
      vi.mocked(
        mediaGalleryAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'auth-mg' }] as any);

      const result = await service.applyAuthorizationPolicy(
        { id: 'framing-1' } as any,
        { id: 'parent-auth' } as any
      );

      // framing auth + profile auth + wb auth + memo auth + mg auth
      expect(result.length).toBe(5);
    });
  });
});
