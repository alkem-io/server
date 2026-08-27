import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { CollaborationLifecycleService } from '@domain/common/collaboration-metadata';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CollaborationDocumentService } from '@services/collaboration-client/collaboration-document.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Memo } from './memo.entity';
import { IMemo } from './memo.interface';
import { MemoService } from './memo.service';

describe('MemoService', () => {
  let service: MemoService;
  let memoRepository: MockType<Repository<Memo>>;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileService: ProfileService;
  let profileDocumentsService: ProfileDocumentsService;
  let fileServiceAdapter: FileServiceAdapter;
  let collaborationLifecycleService: CollaborationLifecycleService;
  let collaborationDocumentService: CollaborationDocumentService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static Memo.create to avoid DataSource requirement
    vi.spyOn(Memo, 'create').mockImplementation((input: any) => {
      const entity = new Memo();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoService,
        repositoryProviderMockFactory(Memo),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MemoService);
    memoRepository = module.get(getRepositoryToken(Memo));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileService = module.get(ProfileService);
    profileDocumentsService = module.get(ProfileDocumentsService);
    fileServiceAdapter = module.get(FileServiceAdapter);
    collaborationLifecycleService = module.get(CollaborationLifecycleService);
    collaborationDocumentService = module.get(CollaborationDocumentService);
  });

  describe('getMemoOrFail', () => {
    it('should return the memo when found', async () => {
      const memo = { id: 'memo-1' } as Memo;
      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.getMemoOrFail('memo-1');

      expect(result).toBe(memo);
    });

    it('should throw EntityNotFoundException when memo not found', async () => {
      memoRepository.findOne!.mockResolvedValue(null);

      await expect(service.getMemoOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('deleteMemo', () => {
    it('should delete profile, authorization, and memo', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);
      (profileService.deleteProfile as Mock).mockResolvedValue({} as any);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      memoRepository.remove!.mockResolvedValue({ ...memo, id: undefined });

      const result = await service.deleteMemo('memo-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        memo.authorization
      );
      expect(
        collaborationLifecycleService.publishDocumentDeleted
      ).toHaveBeenCalledWith('memo-1');
      expect(memoRepository.remove).toHaveBeenCalledWith(memo);
      expect(result.id).toBe('memo-1');
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.deleteMemo('memo-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'profile-1' },
        authorization: undefined,
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.deleteMemo('memo-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('markdownToStateUpdate', () => {
    it('should return null when markdown is undefined', () => {
      const result = service.markdownToStateUpdate(undefined);
      expect(result).toBeNull();
    });

    it('should return a Uint8Array when markdown is provided', () => {
      const result = service.markdownToStateUpdate('# Hello');
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('updateMemo', () => {
    it('should update contentUpdatePolicy when provided', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1' },
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.save!.mockResolvedValue(memo);

      await service.updateMemo('memo-1', {
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      expect(memo.contentUpdatePolicy).toBe(ContentUpdatePolicy.ADMINS);
    });

    it('should update profile when profile data provided', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1' },
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.save!.mockResolvedValue(memo);
      (profileService.updateProfile as Mock).mockResolvedValue({
        id: 'p1',
        displayName: 'Updated',
      } as any);

      await service.updateMemo('memo-1', {
        profile: { displayName: 'Updated' },
      });

      expect(profileService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('replaceMemoContent', () => {
    it('fails closed when there is no initiating actor — never joins the room unauthenticated', async () => {
      await expect(
        service.replaceMemoContent('memo-1', '', '# content')
      ).rejects.toThrow(EntityNotInitializedException);
      expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
    });

    it('should return memo unchanged when newContent is empty', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1', storageBucket: { id: 'sb-1' } },
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.replaceMemoContent('memo-1', 'actor-1', '');

      expect(result).toBe(memo);
      expect(collaborationDocumentService.mutate).not.toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when profile is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: undefined,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(
        service.replaceMemoContent('memo-1', 'actor-1', 'some content')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('reuploads embedded media then applies the replacement THROUGH the live room — never a direct snapshot write', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1', storageBucket: { id: 'sb-1' } },
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      (
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket as Mock
      ).mockResolvedValue('reuploaded content');

      await service.replaceMemoContent('memo-1', 'actor-1', '# Some markdown');

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalled();
      // The content is applied THROUGH the memo's live collaboration room as the
      // initiating actor — the room's own SAVE persists it. The server never writes
      // the snapshot / repoints the pointer directly (which a live room would clobber).
      expect(collaborationDocumentService.mutate).toHaveBeenCalledWith(
        'memo-1',
        'memo',
        'actor-1',
        expect.any(Function)
      );
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return profile when present on memo', async () => {
      const profile = { id: 'profile-1' };
      const memo = { id: 'memo-1', profile } as unknown as IMemo;
      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.getProfile('memo-1');

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile not initialized', async () => {
      const memo = { id: 'memo-1', profile: undefined } as unknown as IMemo;
      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.getProfile('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('createMemo (Release A: seeds a canonical empty snapshot)', () => {
    const storageAggregator = {} as any;

    beforeEach(() => {
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p1',
        storageBucket: { id: 'sb-1' },
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        {} as any
      );
      vi.mocked(
        profileService.materializeProfileContentAndVisualsOrRollback
      ).mockImplementation(async (profile: any) => profile);
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockImplementation(async markdown => markdown);
      memoRepository.save!.mockImplementation(async (m: any) => m);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-memo',
        externalID: 'ext',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      } as any);
    });

    it('seeds the canonical empty Yjs-V2 snapshot for an empty (undefined markdown) create — pointer recorded, contentVersion 0, save after pointer', async () => {
      const result = await service.createMemo(
        { markdown: undefined } as any,
        storageAggregator
      );

      // Exactly one upload, to the memo's OWN bucket.
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledTimes(
        1
      );
      const [snapshotArg, bucketArg] = vi.mocked(
        fileServiceAdapter.createSnapshotInBucket
      ).mock.calls[0];
      expect(bucketArg).toBe('sb-1');
      // Real, non-empty canonical Yjs-V2 bytes that DECODE to an empty memo doc
      // (not merely a truthy Buffer): round-trips to empty markdown.
      expect((snapshotArg as Buffer).length).toBeGreaterThan(0);
      expect(service.binaryToMarkdown(snapshotArg as Buffer)).toBe('');
      // Pointer + version recorded on the returned entity.
      expect(result.contentPointer).toBe('snap-memo');
      expect(result.contentVersion).toBe(0);
      // The pointer is assigned BEFORE the final save (the last save carries it).
      const saveCalls = memoRepository.save!.mock.calls;
      const lastSaved = saveCalls[saveCalls.length - 1][0];
      expect(lastSaved.contentPointer).toBe('snap-memo');
      expect(lastSaved.contentVersion).toBe(0);
    });

    it('rolls back (deleteMemo) and rejects when the initial snapshot upload fails', async () => {
      const deleteSpy = vi
        .spyOn(service, 'deleteMemo')
        .mockResolvedValue({} as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockRejectedValue(
        new Error('file-service down')
      );

      await expect(
        service.createMemo({ markdown: '# x' } as any, storageAggregator)
      ).rejects.toThrow('file-service down');

      expect(deleteSpy).toHaveBeenCalledTimes(1);
    });

    it('preserves the missing-bucket error when rollback also fails', async () => {
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'p1',
      } as any);
      const deleteSpy = vi
        .spyOn(service, 'deleteMemo')
        .mockRejectedValue(new Error('rollback failed'));

      await expect(
        service.createMemo({ markdown: '# x' } as any, storageAggregator)
      ).rejects.toThrow(
        'Memo storage bucket not initialized when materializing Markdown media'
      );

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(MockWinstonProvider.useValue.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rollback after uninitialized memo storage bucket failed',
          rollbackError: 'Error: rollback failed',
        }),
        expect.any(String),
        expect.any(String)
      );
    });

    it('re-homes Markdown media into the new memo bucket before encoding the initial Yjs snapshot', async () => {
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue('![image](https://alkem.io/re-homed-document)');

      const result = await service.createMemo(
        { markdown: '![image](https://alkem.io/source-document)' } as any,
        storageAggregator
      );

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalledWith(
        '![image](https://alkem.io/source-document)',
        expect.objectContaining({ id: 'sb-1' })
      );
      const [snapshot] = vi.mocked(fileServiceAdapter.createSnapshotInBucket)
        .mock.calls[0];
      expect(service.binaryToMarkdown(snapshot as Buffer)).toContain(
        'https://alkem.io/re-homed-document'
      );
      expect(result.contentPointer).toBe('snap-memo');
    });

    it('rolls back the memo when Markdown media cannot be re-homed and never writes a snapshot', async () => {
      const deleteSpy = vi
        .spyOn(service, 'deleteMemo')
        .mockResolvedValue({} as any);
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockRejectedValue(new Error('media copy failed'));

      await expect(
        service.createMemo(
          { markdown: '![image](https://alkem.io/source-document)' } as any,
          storageAggregator
        )
      ).rejects.toThrow('media copy failed');

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });
  });
});
