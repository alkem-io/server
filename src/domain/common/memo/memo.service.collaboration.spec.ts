import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { CollaborationLifecycleService } from '@domain/common/collaboration-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Memo } from './memo.entity';
import { MemoService } from './memo.service';

// Mock the repository token directly so we control findOne + the query builder.
const updateBuilder = () => {
  const qb: any = {
    update: vi.fn(() => qb),
    set: vi.fn(() => qb),
    where: vi.fn(() => qb),
    execute: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  return qb;
};

describe('MemoService — collaboration metadata + lifecycle', () => {
  let service: MemoService;
  let memoRepo: { findOne: Mock; remove: Mock; createQueryBuilder: Mock };
  let lifecycle: { emitDocumentDeleted: Mock };
  let profileService: { deleteProfile: Mock };
  let authorizationPolicyService: { delete: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();
    memoRepo = {
      findOne: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoService,
        MockWinstonProvider,
        { provide: getRepositoryToken(Memo), useValue: memoRepo },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MemoService);
    lifecycle = module.get(CollaborationLifecycleService) as any;
    profileService = module.get(ProfileService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
  });

  describe('getCollaborationMetadata', () => {
    it('returns the persisted contract version (contentVersion) + the entity policy id (FR-004/FR-005)', async () => {
      memoRepo.findOne.mockResolvedValue({
        id: 'm1',
        // The TypeORM @VersionColumn is unrelated to the contract version; it
        // must NOT be returned here.
        version: 9,
        contentVersion: 42,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-1' },
      });

      const meta = await service.getCollaborationMetadata('m1');

      expect(meta).toEqual({
        version: 42,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
        authorizationPolicyId: 'policy-1',
      });
    });

    it('reads 0 when no contract version has been persisted yet (NULL contentVersion)', async () => {
      memoRepo.findOne.mockResolvedValue({
        id: 'm1',
        version: 5,
        contentVersion: null,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-1' },
      });

      const meta = await service.getCollaborationMetadata('m1');

      expect(meta.version).toBe(0);
    });
  });

  describe('saveCollaborationMetadata', () => {
    it('persists the room-owned contract version verbatim into contentVersion, never touching @VersionColumn (FR-004)', async () => {
      const qb = updateBuilder();
      memoRepo.createQueryBuilder.mockReturnValue(qb);
      memoRepo.findOne
        .mockResolvedValueOnce({ id: 'm1' }) // existence check
        .mockResolvedValueOnce({
          id: 'm1',
          contentVersion: 7,
          contentPointer: 'ptr',
          blobStore: BlobStoreKind.S3,
          authorization: { id: 'p' },
        });

      await service.saveCollaborationMetadata('m1', {
        version: 7,
        contentPointer: 'ptr',
        blobStore: BlobStoreKind.S3,
      });

      expect(qb.set).toHaveBeenCalledWith({
        contentVersion: 7,
        contentPointer: 'ptr',
        blobStore: BlobStoreKind.S3,
      });
      // The contract version is NOT routed to the optimistic-locking column.
      const setArg = qb.set.mock.calls[0][0];
      expect(setArg).not.toHaveProperty('version');
      expect(qb.execute).toHaveBeenCalledTimes(1);
    });

    it('round-trips a saved version on the subsequent fetch (save N → fetch N)', async () => {
      const qb = updateBuilder();
      memoRepo.createQueryBuilder.mockReturnValue(qb);
      // existence check, then the post-save re-read reflects the persisted value
      memoRepo.findOne
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce({
          id: 'm1',
          contentVersion: 11,
          contentPointer: 'm1',
          blobStore: BlobStoreKind.INLINE,
          authorization: { id: 'policy-1' },
        });

      await service.saveCollaborationMetadata('m1', {
        version: 11,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
      });

      // Simulate the later fetch reading back the persisted row.
      memoRepo.findOne.mockResolvedValueOnce({
        id: 'm1',
        version: 99, // @VersionColumn churned by unrelated writes — ignored
        contentVersion: 11,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-1' },
      });

      const meta = await service.getCollaborationMetadata('m1');
      expect(meta.version).toBe(11);
    });

    it('persists the latest of two increasing saves', async () => {
      const qb = updateBuilder();
      memoRepo.createQueryBuilder.mockReturnValue(qb);
      memoRepo.findOne.mockResolvedValue({
        id: 'm1',
        contentVersion: 0,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-1' },
      });

      await service.saveCollaborationMetadata('m1', {
        version: 3,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
      });
      await service.saveCollaborationMetadata('m1', {
        version: 4,
        contentPointer: 'm1',
        blobStore: BlobStoreKind.INLINE,
      });

      const versions = qb.set.mock.calls.map((c: any[]) => c[0].contentVersion);
      expect(versions).toEqual([3, 4]);
      expect(versions[versions.length - 1]).toBe(4);
    });
  });

  describe('deleteCollaborationMetadata', () => {
    it('clears the index columns idempotently', async () => {
      const qb = updateBuilder();
      memoRepo.createQueryBuilder.mockReturnValue(qb);

      await service.deleteCollaborationMetadata('m1');

      // contentVersion is cleared too, so a post-delete fetch can't round-trip
      // a stale non-zero version.
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          contentVersion: null,
          contentPointer: null,
          blobStore: null,
        })
      );
      expect(qb.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteMemo emits document.deleted (SC-004)', () => {
    it('emits exactly once after a successful delete', async () => {
      const memo = {
        id: 'm1',
        profile: { id: 'p1' },
        authorization: { id: 'a1' },
      };
      memoRepo.findOne.mockResolvedValue(memo);
      memoRepo.remove.mockResolvedValue({ ...memo });
      profileService.deleteProfile.mockResolvedValue({});
      authorizationPolicyService.delete.mockResolvedValue({});

      await service.deleteMemo('m1');

      expect(lifecycle.emitDocumentDeleted).toHaveBeenCalledTimes(1);
      expect(lifecycle.emitDocumentDeleted).toHaveBeenCalledWith('m1');
    });

    it('does NOT emit when the delete fails before removal', async () => {
      memoRepo.findOne.mockResolvedValue({
        id: 'm1',
        profile: undefined,
        authorization: { id: 'a1' },
      });

      await expect(service.deleteMemo('m1')).rejects.toThrow();

      expect(lifecycle.emitDocumentDeleted).not.toHaveBeenCalled();
    });
  });
});
