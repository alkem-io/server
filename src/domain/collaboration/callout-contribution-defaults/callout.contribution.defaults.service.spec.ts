import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';

describe('CalloutContributionDefaultsService', () => {
  let service: CalloutContributionDefaultsService;
  let profileDocumentsService: ProfileDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionDefaultsService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutContributionDefaultsService);
    profileDocumentsService = module.get(ProfileDocumentsService);
  });

  describe('createCalloutContributionDefaults', () => {
    it('should return empty defaults when no input data is provided', async () => {
      const result = await service.createCalloutContributionDefaults(
        undefined,
        undefined
      );

      expect(result).toBeInstanceOf(CalloutContributionDefaults);
      expect(result.defaultDisplayName).toBeUndefined();
      expect(result.postDescription).toBe('');
      expect(result.whiteboardContent).toBeUndefined();
    });

    it('should set defaultDisplayName and whiteboardContent from input data', async () => {
      const inputData = {
        defaultDisplayName: 'Test Display Name',
        postDescription: 'Test Description',
        whiteboardContent: '{"elements":[]}',
      };

      const result = await service.createCalloutContributionDefaults(
        inputData,
        undefined
      );

      expect(result.defaultDisplayName).toBe('Test Display Name');
      expect(result.whiteboardContent).toBe('{"elements":[]}');
    });

    it('should reupload documents in markdown when storage bucket is provided', async () => {
      const inputData = {
        defaultDisplayName: 'Test',
        postDescription: 'markdown with ![image](http://old-url)',
        whiteboardContent: undefined,
      };
      const storageBucket = { id: 'bucket-id' } as IStorageBucket;
      const reuploadedMarkdown = 'markdown with ![image](http://new-url)';

      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue(reuploadedMarkdown);

      const result = await service.createCalloutContributionDefaults(
        inputData,
        storageBucket
      );

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalledWith(
        'markdown with ![image](http://old-url)',
        storageBucket
      );
      expect(result.postDescription).toBe(reuploadedMarkdown);
    });

    it('should use empty string for postDescription when it is undefined and storage bucket is provided', async () => {
      const inputData = {
        defaultDisplayName: 'Test',
        postDescription: undefined,
        whiteboardContent: undefined,
      };
      const storageBucket = { id: 'bucket-id' } as IStorageBucket;

      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue('');

      await service.createCalloutContributionDefaults(inputData, storageBucket);

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalledWith('', storageBucket);
    });

    it('should assign postDescription directly when no storage bucket is provided', async () => {
      const inputData = {
        defaultDisplayName: 'Test',
        postDescription: 'Direct description',
        whiteboardContent: undefined,
      };

      const result = await service.createCalloutContributionDefaults(
        inputData,
        undefined
      );

      expect(result.postDescription).toBe('Direct description');
      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateCalloutContributionDefaults', () => {
    it('should update defaultDisplayName when provided', () => {
      const defaults = {
        id: 'defaults-id',
        defaultDisplayName: 'Old Name',
        postDescription: 'Old Desc',
        whiteboardContent: 'old-content',
      } as CalloutContributionDefaults;

      const result = service.updateCalloutContributionDefaults(defaults, {
        defaultDisplayName: 'New Name',
      });

      expect(result.defaultDisplayName).toBe('New Name');
      expect(result.postDescription).toBe('Old Desc');
      expect(result.whiteboardContent).toBe('old-content');
    });

    it('should update postDescription when provided', () => {
      const defaults = {
        id: 'defaults-id',
        defaultDisplayName: 'Name',
        postDescription: 'Old Desc',
        whiteboardContent: 'content',
      } as CalloutContributionDefaults;

      const result = service.updateCalloutContributionDefaults(defaults, {
        postDescription: 'New Description',
      });

      expect(result.postDescription).toBe('New Description');
    });

    it('should update whiteboardContent when provided', () => {
      const defaults = {
        id: 'defaults-id',
        whiteboardContent: 'old-wb',
      } as CalloutContributionDefaults;

      const result = service.updateCalloutContributionDefaults(defaults, {
        whiteboardContent: 'new-wb',
      });

      expect(result.whiteboardContent).toBe('new-wb');
    });

    it('should not change fields when update data fields are falsy', () => {
      const defaults = {
        id: 'defaults-id',
        defaultDisplayName: 'Keep',
        postDescription: 'Keep',
        whiteboardContent: 'Keep',
      } as CalloutContributionDefaults;

      const result = service.updateCalloutContributionDefaults(defaults, {});

      expect(result.defaultDisplayName).toBe('Keep');
      expect(result.postDescription).toBe('Keep');
      expect(result.whiteboardContent).toBe('Keep');
    });
  });

  describe('delete', () => {
    it('should remove entity and preserve original ID', async () => {
      const defaults = {
        id: 'original-id',
      } as CalloutContributionDefaults;

      const removedResult = { id: undefined } as any;

      const result = await service.delete(defaults);

      expect(result.id).toBe('original-id');
    });
  });
});
