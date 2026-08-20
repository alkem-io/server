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
    manager: { transaction: Mock };
  };
  let managerMock: { remove: Mock; insert: Mock };
  let lifecycle: { enqueueDocumentDeleted: Mock };
  let profileService: { deleteProfile: Mock };
  let authorizationPolicyService: { delete: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();
    managerMock = { remove: vi.fn(), insert: vi.fn() };
    whiteboardRepo = {
      findOne: vi.fn(),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(),
      // The delete path runs {leaf remove + outbox insert} in one transaction;
      // the mock invokes the callback with a stand-in EntityManager.
      manager: {
        transaction: vi.fn(async (cb: any) => cb(managerMock)),
      },
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
    it("returns the persisted contract version (contentVersion) + the entity policy id + the doc's own storage bucket id (FR-004/FR-005)", async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        // The TypeORM @VersionColumn is unrelated to the contract version; it
        // must NOT be returned here.
        version: 3,
        contentVersion: 21,
        contentPointer: 'w1',
        authorization: { id: 'policy-w' },
        // The whiteboard's OWN bucket via its profile — where this doc's
        // snapshots go.
        profile: { id: 'profile-w', storageBucket: { id: 'bucket-w' } },
      });

      const meta = await service.getCollaborationMetadata('w1');

      expect(meta).toEqual({
        version: 21,
        contentPointer: 'w1',
        authorizationPolicyId: 'policy-w',
        storageBucketId: 'bucket-w',
      });
    });

    it('leaves storageBucketId undefined when the whiteboard has no profile storage bucket', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        version: 3,
        contentVersion: 21,
        contentPointer: 'w1',
        authorization: { id: 'policy-w' },
        profile: { id: 'profile-w', storageBucket: undefined },
      });

      const meta = await service.getCollaborationMetadata('w1');

      expect(meta.storageBucketId).toBeUndefined();
    });

    it('reads 0 when no contract version has been persisted yet (NULL contentVersion)', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        version: 3,
        contentVersion: null,
        contentPointer: 'w1',
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
          authorization: { id: 'p' },
        });

      const result = await service.saveCollaborationMetadata('w1', {
        version: 4,
        contentPointer: 'ptr',
      });

      expect(qb.set).toHaveBeenCalledWith({
        contentVersion: 4,
        contentPointer: 'ptr',
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
          authorization: { id: 'policy-w' },
        });

      await service.saveCollaborationMetadata('w1', {
        version: 8,
        contentPointer: 'w1',
      });

      whiteboardRepo.findOne.mockResolvedValueOnce({
        id: 'w1',
        version: 77, // @VersionColumn churn — ignored
        contentVersion: 8,
        contentPointer: 'w1',
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
        authorization: { id: 'policy-w' },
      });

      await service.saveCollaborationMetadata('w1', {
        version: 2,
        contentPointer: 'w1',
      });
      await service.saveCollaborationMetadata('w1', {
        version: 5,
        contentPointer: 'w1',
      });

      const versions = qb.set.mock.calls.map((c: any[]) => c[0].contentVersion);
      expect(versions).toEqual([2, 5]);
      expect(versions[versions.length - 1]).toBe(5);
    });

    it('preserves the stored contentPointer when the save omits it (blank = unchanged; single-writer contract)', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);
      whiteboardRepo.findOne
        .mockResolvedValueOnce({ id: 'w1' }) // existence check
        .mockResolvedValueOnce({
          id: 'w1',
          contentVersion: 9,
          contentPointer: 'existing-ptr',
          authorization: { id: 'policy-w' },
        });

      // contentPointer is produced only by the checkpoint store's metapointer
      // Record; PreRegister/Room.persist omit it. A save with no contentPointer
      // must NOT overwrite the stored pointer with blank (which would orphan the
      // content), so the query omits the column entirely.
      await service.saveCollaborationMetadata('w1', { version: 9 });

      const setArg = qb.set.mock.calls[0][0];
      expect(setArg).toEqual({ contentVersion: 9 });
      expect(setArg).not.toHaveProperty('contentPointer');
    });
  });

  describe('deleteCollaborationMetadata', () => {
    it('clears the index columns idempotently', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);

      await service.deleteCollaborationMetadata('w1');

      // contentVersion is cleared too, so a post-delete fetch can't round-trip
      // a stale non-zero version.
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          contentVersion: null,
          contentPointer: null,
        })
      );
    });
  });

  describe('deleteWhiteboard records document.deleted (SC-004)', () => {
    it('records exactly once, atomically with the leaf removal, AFTER the profile/auth cascade', async () => {
      const whiteboard = {
        id: 'w1',
        profile: { id: 'p1' },
        authorization: { id: 'a1' },
      };
      whiteboardRepo.findOne.mockResolvedValue(whiteboard);
      managerMock.remove.mockResolvedValue({ ...whiteboard });
      profileService.deleteProfile.mockResolvedValue({});
      authorizationPolicyService.delete.mockResolvedValue({});

      await service.deleteWhiteboard('w1');

      // The leaf removal + the outbox insert run inside ONE transaction.
      expect(whiteboardRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(managerMock.remove).toHaveBeenCalledTimes(1);
      expect(lifecycle.enqueueDocumentDeleted).toHaveBeenCalledTimes(1);
      expect(lifecycle.enqueueDocumentDeleted).toHaveBeenCalledWith(
        managerMock,
        'w1'
      );

      // Ordering the comments claim: the profile + auth cascade (incl. the
      // external file-service blob delete that cannot join a DB tx) runs BEFORE
      // the transaction, never inside/after it.
      const cascadeLast = Math.max(
        profileService.deleteProfile.mock.invocationCallOrder[0],
        authorizationPolicyService.delete.mock.invocationCallOrder[0]
      );
      expect(cascadeLast).toBeLessThan(
        whiteboardRepo.manager.transaction.mock.invocationCallOrder[0]
      );
    });

    it('rejects the delete (and surfaces the error) when the transactional enqueue fails', async () => {
      const whiteboard = {
        id: 'w1',
        profile: { id: 'p1' },
        authorization: { id: 'a1' },
      };
      whiteboardRepo.findOne.mockResolvedValue(whiteboard);
      managerMock.remove.mockResolvedValue({ ...whiteboard });
      profileService.deleteProfile.mockResolvedValue({});
      authorizationPolicyService.delete.mockResolvedValue({});
      // The outbox insert inside the transaction fails -> the whole delete rejects
      // (the transaction rolls back the leaf removal too).
      lifecycle.enqueueDocumentDeleted.mockRejectedValue(
        new Error('outbox insert failed')
      );

      await expect(service.deleteWhiteboard('w1')).rejects.toThrow(
        'outbox insert failed'
      );
    });

    it('does NOT record (or open a transaction) when the delete fails before removal', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        profile: undefined,
        authorization: { id: 'a1' },
      });

      await expect(service.deleteWhiteboard('w1')).rejects.toThrow();

      expect(whiteboardRepo.manager.transaction).not.toHaveBeenCalled();
      expect(lifecycle.enqueueDocumentDeleted).not.toHaveBeenCalled();
    });
  });
});
