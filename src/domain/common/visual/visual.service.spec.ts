import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { Visual } from './visual.entity';
import { IVisual } from './visual.interface';
import { VisualService } from './visual.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('VisualService', () => {
  let service: VisualService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let db: any;

  beforeEach(async () => {
    // Mock static Visual.create to avoid DataSource requirement
    vi.spyOn(Visual, 'create').mockImplementation((input: any) => {
      const entity = new Visual();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisualService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(VisualService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    db = module.get(DRIZZLE);
  });

  describe('createVisual', () => {
    it('should create a visual with authorization policy and default empty uri', () => {
      const result = service.createVisual({
        name: VisualType.AVATAR,
        minWidth: 100,
        maxWidth: 400,
        minHeight: 100,
        maxHeight: 400,
        aspectRatio: 1,
      });

      expect(result.name).toBe(VisualType.AVATAR);
      expect(result.uri).toBe('');
      expect(result.authorization).toBeDefined();
    });

    it('should use initialUri when provided', () => {
      const result = service.createVisual(
        {
          name: VisualType.BANNER,
          minWidth: 384,
          maxWidth: 1536,
          minHeight: 64,
          maxHeight: 256,
          aspectRatio: 6,
        },
        'https://example.com/image.png'
      );

      expect(result.uri).toBe('https://example.com/image.png');
    });

    it('should throw ValidationException when name is not provided', () => {
      expect(() =>
        service.createVisual({
          name: '' as any,
          minWidth: 100,
          maxWidth: 400,
          minHeight: 100,
          maxHeight: 400,
          aspectRatio: 1,
        })
      ).toThrow(ValidationException);
    });
  });

  describe('getVisualOrFail', () => {
    it('should return visual when found', async () => {
      const visual = { id: 'v-1' } as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);

      const result = await service.getVisualOrFail('v-1');

      expect(result).toBe(visual);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getVisualOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateVisual', () => {
    it('should update uri on the visual', async () => {
      const visual = {
        id: 'v-1',
        uri: 'old-uri',
        alternativeText: 'old-alt',
      } as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);
      db.returning.mockResolvedValueOnce([{ ...visual, uri: 'new-uri' }]);

      const result = await service.updateVisual({
        visualID: 'v-1',
        uri: 'new-uri',
      });

      expect(result.uri).toBe('new-uri');
    });

    it('should update alternativeText when provided', async () => {
      const visual = { id: 'v-1', uri: '', alternativeText: 'old' } as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);
      db.returning.mockResolvedValueOnce([{ ...visual, alternativeText: 'new alt text' }]);

      await service.updateVisual({
        visualID: 'v-1',
        uri: '',
        alternativeText: 'new alt text',
      });

      expect(visual.alternativeText).toBe('new alt text');
    });

    it('should not update alternativeText when undefined', async () => {
      const visual = {
        id: 'v-1',
        uri: '',
        alternativeText: 'keep',
      } as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);
      db.returning.mockResolvedValueOnce([{ ...visual, uri: 'new' }]);

      await service.updateVisual({
        visualID: 'v-1',
        uri: 'new',
      });

      expect(visual.alternativeText).toBe('keep');
    });
  });

  describe('deleteVisual', () => {
    it('should delete authorization and remove visual, preserving id', async () => {
      const visual = {
        id: 'v-1',
        authorization: { id: 'auth-1' },
      } as unknown as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      const result = await service.deleteVisual({ ID: 'v-1' });

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        visual.authorization
      );
      expect(result.id).toBe('v-1');
    });

    it('should skip authorization deletion when authorization is not set', async () => {
      const visual = {
        id: 'v-1',
        authorization: undefined,
      } as unknown as Visual;
      db.query.visuals.findFirst.mockResolvedValueOnce(visual);

      await service.deleteVisual({ ID: 'v-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('validateMimeType', () => {
    it('should not throw when mime type is in allowed types', () => {
      const visual = {
        allowedTypes: ['image/png', 'image/jpeg'],
      } as IVisual;

      expect(() => service.validateMimeType(visual, 'image/png')).not.toThrow();
    });

    it('should throw ValidationException when mime type is not allowed', () => {
      const visual = { allowedTypes: ['image/png'] } as IVisual;

      expect(() => service.validateMimeType(visual, 'image/gif')).toThrow(
        ValidationException
      );
    });
  });

  describe('validateImageWidth', () => {
    it('should not throw when width is within allowed range', () => {
      const visual = { minWidth: 100, maxWidth: 400 } as IVisual;

      expect(() => service.validateImageWidth(visual, 200)).not.toThrow();
    });

    it('should throw ValidationException when width is below minimum', () => {
      const visual = { minWidth: 100, maxWidth: 400 } as IVisual;

      expect(() => service.validateImageWidth(visual, 50)).toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when width exceeds maximum', () => {
      const visual = { minWidth: 100, maxWidth: 400 } as IVisual;

      expect(() => service.validateImageWidth(visual, 500)).toThrow(
        ValidationException
      );
    });
  });

  describe('validateImageHeight', () => {
    it('should not throw when height is within allowed range', () => {
      const visual = { minHeight: 100, maxHeight: 400 } as IVisual;

      expect(() => service.validateImageHeight(visual, 200)).not.toThrow();
    });

    it('should throw ValidationException when height is below minimum', () => {
      const visual = { minHeight: 100, maxHeight: 400 } as IVisual;

      expect(() => service.validateImageHeight(visual, 50)).toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when height exceeds maximum', () => {
      const visual = { minHeight: 100, maxHeight: 400 } as IVisual;

      expect(() => service.validateImageHeight(visual, 500)).toThrow(
        ValidationException
      );
    });
  });

  describe('createVisualAvatar', () => {
    it('should create an avatar visual with correct constraints', () => {
      const result = service.createVisualAvatar();

      expect(result.name).toBe(VisualType.AVATAR);
      expect(result.minWidth).toBe(190);
      expect(result.maxWidth).toBe(410);
    });

    it('should use provided uri as initialUri', () => {
      const result = service.createVisualAvatar(
        'https://example.com/avatar.png'
      );

      expect(result.uri).toBe('https://example.com/avatar.png');
    });
  });

  describe('createVisualBanner', () => {
    it('should create a banner visual with correct constraints', () => {
      const result = service.createVisualBanner();

      expect(result.name).toBe(VisualType.BANNER);
      expect(result.minWidth).toBe(384);
      expect(result.maxWidth).toBe(1536);
    });
  });

  describe('createVisualCard', () => {
    it('should create a card visual with correct constraints', () => {
      const result = service.createVisualCard();

      expect(result.name).toBe(VisualType.CARD);
      expect(result.minWidth).toBe(307);
      expect(result.maxWidth).toBe(410);
    });
  });

  describe('createVisualBannerWide', () => {
    it('should create a wide banner visual with correct constraints', () => {
      const result = service.createVisualBannerWide();

      expect(result.name).toBe(VisualType.BANNER_WIDE);
      expect(result.minWidth).toBe(640);
      expect(result.maxWidth).toBe(2560);
    });
  });

  describe('createVisualWhiteboardPreview', () => {
    it('should create a whiteboard preview visual with correct constraints', () => {
      const result = service.createVisualWhiteboardPreview();

      expect(result.name).toBe(VisualType.WHITEBOARD_PREVIEW);
      expect(result.minWidth).toBe(500);
      expect(result.maxWidth).toBe(1800);
    });
  });

  describe('createVisualMediaGalleryImage', () => {
    it('should create a media gallery image visual', () => {
      const result = service.createVisualMediaGalleryImage();

      expect(result.name).toBe(VisualType.MEDIA_GALLERY_IMAGE);
    });
  });

  describe('createVisualMediaGalleryVideo', () => {
    it('should create a media gallery video visual with video allowed types', () => {
      const result = service.createVisualMediaGalleryVideo();

      expect(result.name).toBe(VisualType.MEDIA_GALLERY_VIDEO);
      expect(result.allowedTypes).toContain('video/mp4');
    });
  });
});
