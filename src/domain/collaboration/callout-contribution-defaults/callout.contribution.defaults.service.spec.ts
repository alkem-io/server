import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { CalloutContributionDefaults } from './callout.contribution.defaults.entity';
import { CalloutContributionDefaultsService } from './callout.contribution.defaults.service';

describe('CalloutContributionDefaultsService', () => {
  let service: CalloutContributionDefaultsService;
  let profileDocumentsService: ProfileDocumentsService;
  let repository: Repository<CalloutContributionDefaults>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutContributionDefaultsService,
        repositoryProviderMockFactory(CalloutContributionDefaults),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutContributionDefaultsService);
    profileDocumentsService = module.get(ProfileDocumentsService);
    repository = module.get(getRepositoryToken(CalloutContributionDefaults));
  });

  describe('createCalloutContributionDefaults', () => {
    it('should return empty defaults when no input data is provided', () => {
      const result = service.createCalloutContributionDefaults(undefined);

      expect(result).toBeInstanceOf(CalloutContributionDefaults);
      expect(result.defaultDisplayName).toBeUndefined();
      // entity default for `postDescription` is '' (see entity column)
      expect(result.postDescription).toBe('');
      expect(result.whiteboardContent).toBeUndefined();
    });

    it('should copy fields from input data without invoking file-service', () => {
      const inputData = {
        defaultDisplayName: 'Test Display Name',
        postDescription: 'markdown with ![image](http://old-url)',
        whiteboardContent: '{"elements":[]}',
      };

      const result = service.createCalloutContributionDefaults(inputData);

      expect(result.defaultDisplayName).toBe('Test Display Name');
      expect(result.postDescription).toBe(
        'markdown with ![image](http://old-url)'
      );
      expect(result.whiteboardContent).toBe('{"elements":[]}');
      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).not.toHaveBeenCalled();
    });
  });

  describe('materializeCalloutContributionDefaultsContent', () => {
    const rollback = vi.fn().mockResolvedValue(undefined);
    const storageBucket = { id: 'bucket-id' } as IStorageBucket;

    beforeEach(() => {
      rollback.mockClear();
    });

    it('is a no-op when postDescription is missing', async () => {
      const defaults = {
        id: 'defaults-id',
      } as CalloutContributionDefaults;

      await service.materializeCalloutContributionDefaultsContent(
        defaults,
        storageBucket,
        rollback
      );

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('re-homes markdown URLs and saves when content changed', async () => {
      const defaults = {
        id: 'defaults-id',
        postDescription: 'markdown with ![image](http://old-url)',
      } as CalloutContributionDefaults;
      const reuploaded = 'markdown with ![image](http://new-url)';

      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue(reuploaded);

      await service.materializeCalloutContributionDefaultsContent(
        defaults,
        storageBucket,
        rollback
      );

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalledWith(
        'markdown with ![image](http://old-url)',
        storageBucket
      );
      expect(defaults.postDescription).toBe(reuploaded);
      expect(repository.save).toHaveBeenCalledWith(defaults);
    });

    it('skips the save when re-upload returned identical markdown', async () => {
      const original = 'markdown with no internal urls';
      const defaults = {
        id: 'defaults-id',
        postDescription: original,
      } as CalloutContributionDefaults;

      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue(original);

      await service.materializeCalloutContributionDefaultsContent(
        defaults,
        storageBucket,
        rollback
      );

      expect(defaults.postDescription).toBe(original);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('invokes rollback and rethrows on materialization failure', async () => {
      const defaults = {
        id: 'defaults-id',
        postDescription: 'markdown with ![image](http://old-url)',
      } as CalloutContributionDefaults;
      const failure = new Error('reupload failed');

      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockRejectedValue(failure);

      await expect(
        service.materializeCalloutContributionDefaultsContent(
          defaults,
          storageBucket,
          rollback
        )
      ).rejects.toThrow('reupload failed');
      expect(rollback).toHaveBeenCalled();
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
      vi.mocked(repository.remove).mockResolvedValue(removedResult);

      const result = await service.delete(defaults);

      expect(repository.remove).toHaveBeenCalledWith(defaults);
      expect(result.id).toBe('original-id');
    });
  });
});
