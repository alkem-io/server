import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { MediaGallery } from './media.gallery.entity';
import { MediaGalleryService } from './media.gallery.service';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { VisualType } from '@common/enums/visual.type';
import { VisualService } from '../visual/visual.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { IMediaGallery } from './media.gallery.interface';
import { Visual } from '../visual/visual.entity';

describe('MediaGalleryService', () => {
  let service: MediaGalleryService;
  let mediaGalleryRepository: MockType<Repository<MediaGallery>>;
  let visualService: VisualService;
  let storageBucketService: StorageBucketService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    // Mock static MediaGallery.create to avoid DataSource requirement
    vi.spyOn(MediaGallery, 'create').mockImplementation((input: any) => {
      const entity = new MediaGallery();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaGalleryService,
        repositoryProviderMockFactory(MediaGallery),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MediaGalleryService);
    mediaGalleryRepository = module.get(getRepositoryToken(MediaGallery));
    visualService = module.get(VisualService);
    storageBucketService = module.get(StorageBucketService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  describe('getMediaGalleryOrFail', () => {
    it('should return media gallery when found', async () => {
      const mg = { id: 'mg-1', visuals: [] } as unknown as MediaGallery;
      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      const result = await service.getMediaGalleryOrFail('mg-1');

      expect(result).toBe(mg);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      mediaGalleryRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.getMediaGalleryOrFail('missing')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should sort visuals by sortOrder ascending', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [
          { id: 'v3', sortOrder: 3 },
          { id: 'v1', sortOrder: 1 },
          { id: 'v2', sortOrder: 2 },
        ],
      } as unknown as MediaGallery;
      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      const result = await service.getMediaGalleryOrFail('mg-1');

      expect(result.visuals![0].id).toBe('v1');
      expect(result.visuals![1].id).toBe('v2');
      expect(result.visuals![2].id).toBe('v3');
    });

    it('should handle visuals with undefined sortOrder by placing them last', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [
          { id: 'v-no-sort', sortOrder: undefined },
          { id: 'v1', sortOrder: 1 },
        ],
      } as unknown as MediaGallery;
      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      const result = await service.getMediaGalleryOrFail('mg-1');

      expect(result.visuals![0].id).toBe('v1');
      expect(result.visuals![1].id).toBe('v-no-sort');
    });
  });

  describe('addVisualToMediaGallery', () => {
    it('should auto-increment sortOrder from existing visuals when not specified', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [
          { id: 'v1', sortOrder: 3 } as Visual,
          { id: 'v2', sortOrder: 5 } as Visual,
        ],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);
      (visualService.createVisual as Mock).mockReturnValue({
        id: 'v-new',
        sortOrder: 6,
      } as any);
      (visualService.saveVisual as Mock).mockResolvedValue({
        id: 'v-new',
      } as any);

      const result = await service.addVisualToMediaGallery(
        'mg-1',
        VisualType.MEDIA_GALLERY_IMAGE
      );

      expect(visualService.createVisual).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 6 })
      );
      expect(result).toBeDefined();
    });

    it('should default sortOrder to 1 when media gallery has no visuals', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);
      (visualService.createVisual as Mock).mockReturnValue({
        id: 'v-new',
      } as any);
      (visualService.saveVisual as Mock).mockResolvedValue({
        id: 'v-new',
      } as any);

      await service.addVisualToMediaGallery(
        'mg-1',
        VisualType.MEDIA_GALLERY_IMAGE
      );

      expect(visualService.createVisual).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 1 })
      );
    });

    it('should use explicit sortOrder when provided', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [{ id: 'v1', sortOrder: 5 } as Visual],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);
      (visualService.createVisual as Mock).mockReturnValue({
        id: 'v-new',
      } as any);
      (visualService.saveVisual as Mock).mockResolvedValue({
        id: 'v-new',
      } as any);

      await service.addVisualToMediaGallery(
        'mg-1',
        VisualType.MEDIA_GALLERY_IMAGE,
        42
      );

      expect(visualService.createVisual).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 42 })
      );
    });
  });

  describe('deleteVisualFromMediaGallery', () => {
    it('should delete visual when found in media gallery', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [{ id: 'v1' } as Visual, { id: 'v2' } as Visual],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);
      (visualService.deleteVisual as Mock).mockResolvedValue({} as any);

      const result = await service.deleteVisualFromMediaGallery('mg-1', 'v1');

      expect(visualService.deleteVisual).toHaveBeenCalledWith({ ID: 'v1' });
      expect(result.id).toBe('v1');
    });

    it('should throw EntityNotFoundException when visual not in media gallery', async () => {
      const mg = {
        id: 'mg-1',
        visuals: [{ id: 'v1' } as Visual],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      await expect(
        service.deleteVisualFromMediaGallery('mg-1', 'v-missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('deleteMediaGallery', () => {
    it('should delete visuals, storage bucket, authorization, and media gallery', async () => {
      const mg = {
        id: 'mg-1',
        authorization: { id: 'auth-1' },
        storageBucket: { id: 'sb-1' },
        visuals: [{ id: 'v1' } as Visual, { id: 'v2' } as Visual],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);
      mediaGalleryRepository.remove!.mockResolvedValue({
        ...mg,
        id: undefined,
      });
      (visualService.deleteVisual as Mock).mockResolvedValue({} as any);
      (storageBucketService.deleteStorageBucket as Mock).mockResolvedValue(
        {} as any
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(
        {} as any
      );

      const result = await service.deleteMediaGallery('mg-1');

      expect(visualService.deleteVisual).toHaveBeenCalledTimes(2);
      expect(storageBucketService.deleteStorageBucket).toHaveBeenCalledWith(
        'sb-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mg.authorization
      );
      expect(result.id).toBe('mg-1');
    });

    it('should throw RelationshipNotFoundException when storage bucket is missing', async () => {
      const mg = {
        id: 'mg-1',
        authorization: { id: 'auth-1' },
        storageBucket: undefined,
        visuals: [],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      await expect(service.deleteMediaGallery('mg-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const mg = {
        id: 'mg-1',
        authorization: undefined,
        storageBucket: { id: 'sb-1' },
        visuals: [],
      } as unknown as MediaGallery;

      mediaGalleryRepository.findOne!.mockResolvedValue(mg);

      await expect(service.deleteMediaGallery('mg-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});
