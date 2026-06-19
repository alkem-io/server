import { AuthorizationPrivilege } from '@common/enums';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MemoService } from '@domain/common/memo';
import { WhiteboardService } from '@domain/common/whiteboard';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { CollaborationIntegrationService } from './collaboration-integration.service';
import { CollaborationErrorCode } from './types';

const memoMeta = {
  version: 4,
  contentPointer: 'memo-1',
  blobStore: BlobStoreKind.INLINE,
  authorizationPolicyId: 'policy-memo',
};
const whiteboardMeta = {
  version: 7,
  contentPointer: 'wb-1',
  blobStore: BlobStoreKind.INLINE,
  authorizationPolicyId: 'policy-wb',
};

describe('CollaborationIntegrationService', () => {
  let service: CollaborationIntegrationService;
  let memoService: {
    getCollaborationMetadata: Mock;
    saveCollaborationMetadata: Mock;
    deleteCollaborationMetadata: Mock;
    getMemoOrFail: Mock;
    isMultiUser: Mock;
    getProfile: Mock;
  };
  let whiteboardService: {
    getCollaborationMetadata: Mock;
    saveCollaborationMetadata: Mock;
    deleteCollaborationMetadata: Mock;
    getWhiteboardOrFail: Mock;
    isMultiUser: Mock;
    getProfile: Mock;
  };
  let authorizationService: { isAccessGranted: Mock };
  let actorContextService: { buildForUser: Mock };
  let contributionReporter: {
    memoContribution: Mock;
    whiteboardContribution: Mock;
  };
  let communityResolver: {
    getCommunityForMemoOrFail: Mock;
    getCommunityFromWhiteboardOrFail: Mock;
    getLevelZeroSpaceIdForCommunity: Mock;
  };

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'collaboration.memo.max_collaborators_in_room') return 10;
      if (key === 'collaboration.whiteboards.max_collaborators_in_room')
        return 12;
      return undefined;
    }),
  };

  const notFound = () =>
    new EntityNotFoundException('not found', 'MEMOS' as any);

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationIntegrationService,
        { provide: ConfigService, useValue: configServiceMock },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationIntegrationService);
    memoService = module.get(MemoService) as any;
    whiteboardService = module.get(WhiteboardService) as any;
    authorizationService = module.get(AuthorizationService) as any;
    actorContextService = module.get(ActorContextService) as any;
    contributionReporter = module.get(ContributionReporterService) as any;
    communityResolver = module.get(CommunityResolverService) as any;
  });

  describe('save', () => {
    it('upserts the memo index for an inline memo (SC-001)', async () => {
      memoService.saveCollaborationMetadata.mockResolvedValue(undefined);

      const result = await service.save({
        id: 'memo-1',
        contentType: CollaborationContentType.MEMO,
        version: 5,
        contentPointer: 'memo-1',
        blobStore: BlobStoreKind.INLINE,
      });

      expect(result).toEqual({ success: true });
      // The room-owned contract version is forwarded verbatim (FR-004).
      expect(memoService.saveCollaborationMetadata).toHaveBeenCalledWith(
        'memo-1',
        {
          version: 5,
          contentPointer: 'memo-1',
          blobStore: BlobStoreKind.INLINE,
        }
      );
      expect(
        whiteboardService.saveCollaborationMetadata
      ).not.toHaveBeenCalled();
    });

    it('routes a whiteboard save to the whiteboard service', async () => {
      whiteboardService.saveCollaborationMetadata.mockResolvedValue(undefined);

      const result = await service.save({
        id: 'wb-1',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 2,
        contentPointer: 's3://bucket/wb-1',
        blobStore: BlobStoreKind.S3,
      });

      expect(result).toEqual({ success: true });
      expect(whiteboardService.saveCollaborationMetadata).toHaveBeenCalledWith(
        'wb-1',
        {
          version: 2,
          contentPointer: 's3://bucket/wb-1',
          blobStore: BlobStoreKind.S3,
        }
      );
    });

    it('stores only metadata + pointer for an offloaded blob (SC-002)', async () => {
      whiteboardService.saveCollaborationMetadata.mockResolvedValue(undefined);

      await service.save({
        id: 'wb-1',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 3,
        contentPointer: 'file-uuid',
        blobStore: BlobStoreKind.FILE_SERVICE,
      });

      // The unified save never carries the blob — only the index update
      // (version + pointer + store) is forwarded to the domain service.
      expect(whiteboardService.saveCollaborationMetadata).toHaveBeenCalledWith(
        'wb-1',
        {
          version: 3,
          contentPointer: 'file-uuid',
          blobStore: BlobStoreKind.FILE_SERVICE,
        }
      );
    });

    it('returns a structured error for an unknown blobStore (FR-004)', async () => {
      const result = await service.save({
        id: 'memo-1',
        contentType: CollaborationContentType.MEMO,
        version: 1,
        contentPointer: 'memo-1',
        blobStore: 'bogus' as BlobStoreKind,
      });

      expect(result.success).toBe(false);
      // The reply carries only the typed code — no dynamic blobStore / id leak.
      expect(result.error).toBe(CollaborationErrorCode.UNKNOWN_BLOB_STORE);
      expect(memoService.saveCollaborationMetadata).not.toHaveBeenCalled();
    });

    it('rejects an unknown contentType without routing to a write path', async () => {
      const result = await service.save({
        id: 'doc-1',
        contentType: 'bogus' as CollaborationContentType,
        version: 1,
        contentPointer: 'doc-1',
        blobStore: BlobStoreKind.INLINE,
      });

      expect(result.success).toBe(false);
      // Typed code only — neither the dynamic contentType nor the id leaks.
      expect(result.error).toBe(CollaborationErrorCode.UNKNOWN_CONTENT_TYPE);
      expect(memoService.saveCollaborationMetadata).not.toHaveBeenCalled();
      expect(
        whiteboardService.saveCollaborationMetadata
      ).not.toHaveBeenCalled();
    });

    it('returns a structured error (no leak) when the domain save throws', async () => {
      memoService.saveCollaborationMetadata.mockRejectedValue(notFound());

      const result = await service.save({
        id: 'memo-x',
        contentType: CollaborationContentType.MEMO,
        version: 1,
        contentPointer: 'memo-x',
        blobStore: BlobStoreKind.INLINE,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(CollaborationErrorCode.INTERNAL_ERROR);
    });
  });

  describe('fetch', () => {
    it('returns the memo index incl. authorizationPolicyId (FR-005)', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);

      const result = await service.fetch({ id: 'memo-1' });

      expect(result).toEqual({
        found: true,
        contentType: CollaborationContentType.MEMO,
        version: 4,
        contentPointer: 'memo-1',
        blobStore: BlobStoreKind.INLINE,
        authorizationPolicyId: 'policy-memo',
      });
    });

    it('falls through to whiteboard when the id is not a memo', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );

      const result = await service.fetch({ id: 'wb-1' });

      expect(result.found).toBe(true);
      expect(result.contentType).toBe(CollaborationContentType.WHITEBOARD);
      expect(result.authorizationPolicyId).toBe('policy-wb');
    });

    it('returns a structured not-found for an absent id (FR-004)', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockRejectedValue(notFound());

      const result = await service.fetch({ id: 'nope' });

      expect(result).toEqual({ found: false });
    });

    it('returns a structured error on an unexpected failure (no leak)', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(
        new Error('DB down')
      );

      const result = await service.fetch({ id: 'memo-1' });

      expect(result.found).toBe(false);
      expect(result.error).toBe(CollaborationErrorCode.INTERNAL_ERROR);
    });

    it('returns a structured error when the whiteboard lookup throws a non-not-found error', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockRejectedValue(
        new Error('DB down')
      );

      const result = await service.fetch({ id: 'wb-1' });

      expect(result.found).toBe(false);
      expect(result.error).toBe(CollaborationErrorCode.INTERNAL_ERROR);
    });
  });

  // Proves the contract version owned by the collab room round-trips through
  // the server: the value sent on `collaboration-save` is the value returned on
  // `collaboration-fetch` (FR-004) — the server never substitutes its own
  // counter. The domain service is stubbed with an in-memory store keyed by the
  // contract `version` (mirroring the real `contentVersion` column).
  describe('version round-trip (FR-004)', () => {
    it('memo: save version=N → fetch returns N', async () => {
      const persisted = new Map<string, number>();
      memoService.saveCollaborationMetadata.mockImplementation(
        async (id: string, update: { version: number }) => {
          persisted.set(id, update.version);
        }
      );
      memoService.getCollaborationMetadata.mockImplementation(
        async (id: string) => ({
          version: persisted.get(id) ?? 0,
          contentPointer: id,
          blobStore: BlobStoreKind.INLINE,
          authorizationPolicyId: 'policy-memo',
        })
      );

      const N = 17;
      const saveResult = await service.save({
        id: 'memo-rt',
        contentType: CollaborationContentType.MEMO,
        version: N,
        contentPointer: 'memo-rt',
        blobStore: BlobStoreKind.INLINE,
      });
      expect(saveResult).toEqual({ success: true });

      const fetchResult = await service.fetch({ id: 'memo-rt' });
      expect(fetchResult.found).toBe(true);
      expect(fetchResult.version).toBe(N);
    });

    it('whiteboard: two saves with increasing versions persist the latest', async () => {
      const persisted = new Map<string, number>();
      whiteboardService.saveCollaborationMetadata.mockImplementation(
        async (id: string, update: { version: number }) => {
          persisted.set(id, update.version);
        }
      );
      // memo lookup misses so fetch falls through to the whiteboard.
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockImplementation(
        async (id: string) => ({
          version: persisted.get(id) ?? 0,
          contentPointer: id,
          blobStore: BlobStoreKind.INLINE,
          authorizationPolicyId: 'policy-wb',
        })
      );

      await service.save({
        id: 'wb-rt',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 6,
        contentPointer: 'wb-rt',
        blobStore: BlobStoreKind.INLINE,
      });
      await service.save({
        id: 'wb-rt',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 9,
        contentPointer: 'wb-rt',
        blobStore: BlobStoreKind.INLINE,
      });

      const fetchResult = await service.fetch({ id: 'wb-rt' });
      expect(fetchResult.found).toBe(true);
      expect(fetchResult.version).toBe(9);
    });
  });

  describe('delete', () => {
    it('idempotently purges both memo and whiteboard index', async () => {
      memoService.deleteCollaborationMetadata.mockResolvedValue(undefined);
      whiteboardService.deleteCollaborationMetadata.mockResolvedValue(
        undefined
      );

      const result = await service.delete({ id: 'doc-1' });

      expect(result).toEqual({ success: true });
      expect(memoService.deleteCollaborationMetadata).toHaveBeenCalledWith(
        'doc-1'
      );
      expect(
        whiteboardService.deleteCollaborationMetadata
      ).toHaveBeenCalledWith('doc-1');
    });

    it('treats an absent document as success (idempotent)', async () => {
      // The domain delete is an idempotent UPDATE: a missing row resolves
      // without throwing, so deleting an absent document is success.
      memoService.deleteCollaborationMetadata.mockResolvedValue(undefined);
      whiteboardService.deleteCollaborationMetadata.mockResolvedValue(
        undefined
      );

      const result = await service.delete({ id: 'gone' });

      expect(result).toEqual({ success: true });
    });

    it('returns a structured error (no leak) on an unexpected failure', async () => {
      memoService.deleteCollaborationMetadata.mockRejectedValue(
        new Error('boom')
      );

      const result = await service.delete({ id: 'doc-1' });

      expect(result.success).toBe(false);
      // The raw cause must not cross the bus — only the typed code.
      expect(result.error).toBe(CollaborationErrorCode.INTERNAL_ERROR);
    });
  });

  describe('info', () => {
    it('returns read+update for a memo with full access (update-content)', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);
      memoService.getMemoOrFail.mockResolvedValue({
        authorization: { id: 'policy-memo' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(true);
      memoService.isMultiUser.mockResolvedValue(true);

      const result = await service.info({ actorId: 'actor-1', id: 'memo-1' });

      expect(result).toEqual({
        read: true,
        update: true,
        isMultiUser: true,
        maxCollaborators: 10,
      });
      // read = AuthorizationPrivilege.READ, collaborate = UPDATE_CONTENT (OPEN-1)
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        AuthorizationPrivilege.READ
      );
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        AuthorizationPrivilege.UPDATE_CONTENT
      );
    });

    it('denies update when only read is granted', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);
      memoService.getMemoOrFail.mockResolvedValue({
        authorization: { id: 'policy-memo' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted
        .mockReturnValueOnce(true) // READ
        .mockReturnValueOnce(false); // UPDATE_CONTENT
      memoService.isMultiUser.mockResolvedValue(false);

      const result = await service.info({ actorId: 'actor-1', id: 'memo-1' });

      expect(result.read).toBe(true);
      expect(result.update).toBe(false);
      expect(result.maxCollaborators).toBe(1);
    });

    it('returns whiteboard info (maxCollaborators from config)', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        authorization: { id: 'policy-wb' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(true);
      whiteboardService.isMultiUser.mockResolvedValue(true);

      const result = await service.info({ actorId: 'actor-1', id: 'wb-1' });

      expect(result).toEqual({
        read: true,
        update: true,
        maxCollaborators: 12,
      });
    });

    it('returns maxCollaborators = 1 for a single-user whiteboard', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        authorization: { id: 'policy-wb' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(true);
      whiteboardService.isMultiUser.mockResolvedValue(false);

      const result = await service.info({ actorId: 'actor-1', id: 'wb-1' });

      expect(result.maxCollaborators).toBe(1);
    });

    it('denies an unknown document', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockRejectedValue(notFound());

      const result = await service.info({ actorId: 'actor-1', id: 'nope' });

      expect(result).toEqual({ read: false, update: false });
    });

    it('returns all-false for a memo when read is denied (no update check)', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);
      memoService.getMemoOrFail.mockResolvedValue({
        authorization: { id: 'policy-memo' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(false); // READ denied

      const result = await service.info({ actorId: 'actor-1', id: 'memo-1' });

      expect(result).toEqual({
        read: false,
        update: false,
        isMultiUser: false,
      });
      // Only the READ check runs; UPDATE_CONTENT is never evaluated.
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(1);
    });

    it('returns read-only for a whiteboard when read is denied', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );
      whiteboardService.getWhiteboardOrFail.mockResolvedValue({
        authorization: { id: 'policy-wb' },
      });
      actorContextService.buildForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(false); // READ denied

      const result = await service.info({ actorId: 'actor-1', id: 'wb-1' });

      expect(result).toEqual({ read: false, update: false });
    });

    it('denies access (read=false) when the memo lookup throws (access-granted catch)', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);
      memoService.getMemoOrFail.mockRejectedValue(new Error('DB blip'));

      const result = await service.info({ actorId: 'actor-1', id: 'memo-1' });

      expect(result.read).toBe(false);
      expect(result.update).toBe(false);
    });

    it('denies access (read=false) when the whiteboard lookup throws (access-granted catch)', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );
      whiteboardService.getWhiteboardOrFail.mockRejectedValue(
        new Error('DB blip')
      );

      const result = await service.info({ actorId: 'actor-1', id: 'wb-1' });

      expect(result.read).toBe(false);
    });

    it('normalizes an unexpected lookup failure into a deny (never throws on the bus)', async () => {
      // A non-not-found error from the metadata lookup must not escape the
      // responder: info degrades to a deny like save/fetch/delete.
      memoService.getCollaborationMetadata.mockRejectedValue(
        new Error('DB down')
      );

      const result = await service.info({ actorId: 'actor-1', id: 'memo-1' });

      expect(result).toEqual({ read: false, update: false });
    });
  });

  describe('contribution', () => {
    it('reports a memo contribution for each user', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);
      communityResolver.getCommunityForMemoOrFail.mockResolvedValue({
        id: 'community-1',
      });
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      memoService.getProfile.mockResolvedValue({ displayName: 'My Memo' });

      await service.contribution({
        id: 'memo-1',
        users: [{ id: 'u1' }, { id: 'u2' }],
      });

      expect(contributionReporter.memoContribution).toHaveBeenCalledTimes(2);
      expect(contributionReporter.memoContribution).toHaveBeenCalledWith(
        { id: 'memo-1', name: 'My Memo', space: 'space-root' },
        { actorID: 'u1' }
      );
    });

    it('reports a whiteboard contribution when the id is a whiteboard', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );
      communityResolver.getCommunityFromWhiteboardOrFail.mockResolvedValue({
        id: 'community-1',
      });
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      whiteboardService.getProfile.mockResolvedValue({ displayName: 'My WB' });

      await service.contribution({
        id: 'wb-1',
        users: [{ id: 'u1' }],
      });

      expect(contributionReporter.whiteboardContribution).toHaveBeenCalledWith(
        { id: 'wb-1', name: 'My WB', space: 'space-root' },
        { actorID: 'u1' }
      );
    });

    it('no-ops for an unknown document', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockRejectedValue(notFound());

      await service.contribution({ id: 'nope', users: [{ id: 'u1' }] });

      expect(contributionReporter.memoContribution).not.toHaveBeenCalled();
      expect(
        contributionReporter.whiteboardContribution
      ).not.toHaveBeenCalled();
    });
  });
});
