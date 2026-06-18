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
    it('returns the index + the entity policy id (FR-005)', async () => {
      whiteboardRepo.findOne.mockResolvedValue({
        id: 'w1',
        version: 3,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorization: { id: 'policy-w' },
      });

      const meta = await service.getCollaborationMetadata('w1');

      expect(meta).toEqual({
        version: 3,
        contentPointer: 'w1',
        blobStore: BlobStoreKind.INLINE,
        authorizationPolicyId: 'policy-w',
      });
    });
  });

  describe('saveCollaborationMetadata', () => {
    it('updates index columns via the query builder (no compression hook)', async () => {
      const qb = updateBuilder();
      whiteboardRepo.createQueryBuilder.mockReturnValue(qb);
      whiteboardRepo.findOne
        .mockResolvedValueOnce({ id: 'w1' }) // existence check
        .mockResolvedValueOnce({
          id: 'w1',
          version: 4,
          contentPointer: 'ptr',
          blobStore: BlobStoreKind.FILE_SERVICE,
          authorization: { id: 'p' },
        });

      const result = await service.saveCollaborationMetadata('w1', {
        contentPointer: 'ptr',
        blobStore: BlobStoreKind.FILE_SERVICE,
      });

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPointer: 'ptr',
          blobStore: BlobStoreKind.FILE_SERVICE,
        })
      );
      expect(qb.execute).toHaveBeenCalledTimes(1);
      expect(result.contentPointer).toBe('ptr');
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
