import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IAuthorizationPolicy } from '../authorization-policy/authorization.policy.interface';
import { VisualAuthorizationService } from '../visual/visual.service.authorization';
import { MediaGalleryService } from './media.gallery.service';
import { MediaGalleryAuthorizationService } from './media.gallery.service.authorization';

describe('MediaGalleryAuthorizationService', () => {
  let service: MediaGalleryAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let mediaGalleryService: MediaGalleryService;
  let storageBucketAuthorizationService: StorageBucketAuthorizationService;
  let visualAuthorizationService: VisualAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaGalleryAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MediaGalleryAuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    mediaGalleryService = module.get(MediaGalleryService);
    storageBucketAuthorizationService = module.get(
      StorageBucketAuthorizationService
    );
    visualAuthorizationService = module.get(VisualAuthorizationService);
  });

  const createMediaGallery = (overrides: any = {}) => ({
    id: 'mg-1',
    createdBy: 'user-1',
    authorization: {
      id: 'auth-1',
      credentialRules: [],
    } as unknown as IAuthorizationPolicy,
    storageBucket: { id: 'sb-1', authorization: { id: 'sb-auth' } },
    visuals: [],
    ...overrides,
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent auth and apply to storage bucket', async () => {
      const mediaGallery = createMediaGallery();
      const parentAuth = { id: 'parent' } as unknown as IAuthorizationPolicy;

      (mediaGalleryService.getMediaGalleryOrFail as Mock).mockResolvedValue(
        mediaGallery
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([{ id: 'sb-auth-updated' }]);

      const result = await service.applyAuthorizationPolicy('mg-1', parentAuth);

      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(mediaGallery.authorization, parentAuth);
      expect(
        storageBucketAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply auth to visuals when present', async () => {
      const visualAuth = { id: 'vis-auth' } as unknown as IAuthorizationPolicy;
      const mediaGallery = createMediaGallery({
        visuals: [{ id: 'vis-1', authorization: visualAuth }],
      });

      (mediaGalleryService.getMediaGalleryOrFail as Mock).mockResolvedValue(
        mediaGallery
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);
      (
        visualAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockReturnValue(visualAuth);

      const result = await service.applyAuthorizationPolicy('mg-1', undefined);

      expect(
        visualAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(
        mediaGallery.visuals[0],
        mediaGallery.authorization
      );
      expect(result).toContain(visualAuth);
    });

    it('should create credential rule when createdBy is present', async () => {
      const mediaGallery = createMediaGallery({ createdBy: 'user-1' });

      (mediaGalleryService.getMediaGalleryOrFail as Mock).mockResolvedValue(
        mediaGallery
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule' }
      );
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('mg-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should not create credential rule when createdBy is absent', async () => {
      const mediaGallery = createMediaGallery({ createdBy: undefined });

      (mediaGalleryService.getMediaGalleryOrFail as Mock).mockResolvedValue(
        mediaGallery
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mediaGallery.authorization);
      (
        storageBucketAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockResolvedValue([]);

      await service.applyAuthorizationPolicy('mg-1', undefined);

      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when storageBucket not loaded', async () => {
      const mediaGallery = createMediaGallery({ storageBucket: undefined });

      (mediaGalleryService.getMediaGalleryOrFail as Mock).mockResolvedValue(
        mediaGallery
      );

      await expect(
        service.applyAuthorizationPolicy('mg-1', undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
