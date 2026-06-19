import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { CollaborationLifecycleService } from '@domain/common/collaboration-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardService } from './whiteboard.service';

const updateBuilder = () => {
  const qb: any = {
    update: vi.fn(() => qb),
    set: vi.fn(() => qb),
    where: vi.fn(() => qb),
    execute: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  return qb;
};

describe('WhiteboardService — collaboration metadata + lifecycle', () => {
  let service: WhiteboardService;
  let whiteboardRepo: {
    findOne: Mock;
    remove: Mock;
    createQueryBuilder: Mock;
  };
  let lifecycle: { emitDocumentDeleted: Mock };
  let profileService: { deleteProfile: Mock };
  let authorizationPolicyService: { delete: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();
    whiteboardRepo = {
      findOne: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardService,
        MockWinstonProvider,
        { provide: getRepositoryToken(Whiteboard), useValue: whiteboardRepo },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(WhiteboardService);
    lifecycle = module.get(CollaborationLifecycleService) as any;
    profileService = module.get(ProfileService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
  });

  describe('getCollaborationMetadata', () => {
    it('returns the persisted contract version (contentVersion) + the entity policy id (FR-004/FR-005)', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        // The TypeORM @VersionColumn is unrelated to the contract version; it
        // must NOT be returned here.
        version: 3,
        contentVersion: 21,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-w' },
      });

      const meta = await service.getCollaborationMetadata('w1');

      expect(meta).toEqual({
        version: 21,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorizationPolicyId: 'policy-w',
      });
    });

    it('reads 0 when no contract version has been persisted yet (NULL contentVersion)', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        version: 3,
        contentVersion: null,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-w' },
      });

      const meta = await service.getCollaborationMetadata('w1');

      expect(meta.version).toBe(0);
    });
  });

  describe('saveCollaborationMetadata', () => {
    it('persists the room-owned contract version verbatim into contentVersion, never touching @VersionColumn (FR-004)', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);
      whiteboardRepo.findOne
        .mockResolvedValueOnce({ id: 'w1' }) // existence check
        .mockResolvedValueOnce({
          id: 'w1',
          contentVersion: 4,
          contentPointer: 'ptr',
          blobStore: BlobStoreKind.FILE_SERVICE,
          authorization: { id: 'p' },
        });

      const result = await service.saveCollaborationMetadata('w1', {
        version: 4,
        contentPointer: 'ptr',
        blobStore: BlobStoreKind.FILE_SERVICE,
      });

      expect(qb.set).toHaveBeenCalledWith({
        contentVersion: 4,
        contentPointer: 'ptr',
        blobStore: BlobStoreKind.FILE_SERVICE,
      });
      // The contract version is NOT routed to the optimistic-locking column.
      const setArg = qb.set.mock.calls[0][0];
      expect(setArg).not.toHaveProperty('version');
      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result.contentPointer).toBe('ptr');
    });

    it('round-trips a saved version on the subsequent fetch (save N → fetch N)', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);
      whiteboardRepo.findOne
        .mockResolvedValueOnce({ id: 'w1' })
        .mockResolvedValueOnce({
          id: 'w1',
          contentVersion: 8,
          contentPointer: 'w1',
          blobStore: BlobStoreKind.INLINE,
          authorization: { id: 'policy-w' },
        });

      await service.saveCollaborationMetadata('w1', {
        version: 8,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
      });

      whiteboardRepo.findOne.mockResolvedValueOnce({
        id: 'w1',
        version: 77, // @VersionColumn churn — ignored
        contentVersion: 8,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-w' },
      });

      const meta = await service.getCollaborationMetadata('w1');
      expect(meta.version).toBe(8);
    });

    it('persists the latest of two increasing saves', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        contentVersion: 0,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-w' },
      });

      await service.saveCollaborationMetadata('w1', {
        version: 2,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
      });
      await service.saveCollaborationMetadata('w1', {
        version: 5,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
      });

      const versions = qb.set.mock.calls.map((c: any[]) => c[0].contentVersion);
      expect(versions).toEqual([2, 5]);
      expect(versions[versions.length - 1]).toBe(5);
    });
  });

  describe('deleteCollaborationMetadata', () => {
    it('clears the index columns idempotently', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.deleteCollaborationMetadata('w1');

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ contentPointer: null, blobStore: null })
      );
    });
  });

  describe('deleteWhiteboard emits document.deleted (SC-004)', () => {
    it('emits exactly once after a successful delete', async () => {
      const whiteboard = {
        id: 'w1',
        profile: { id: 'p1' },
        authorization: { id: 'a1' },
      };
      whiteboardRepo.findOne.mockResolvedValue(whiteboard);
      whiteboardRepo.remove.mockResolvedValue({ ...whiteboard });
      profileService.deleteProfile.mockResolvedValue({});
      authorizationPolicyService.delete.mockResolvedValue({});

      await service.deleteWhiteboard('w1');

      expect(lifecycle.emitDocumentDeleted).toHaveBeenCalledTimes(1);
      expect(lifecycle.emitDocumentDeleted).toHaveBeenCalledWith('w1');
    });

    it('does NOT emit when the delete fails before removal', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        profile: undefined,
        authorization: { id: 'a1' },
      });

      await expect(service.deleteWhiteboard('w1')).rejects.toThrow();

      expect(lifecycle.emitDocumentDeleted).not.toHaveBeenCalled();
    });
  });
});
