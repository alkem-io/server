import { CollaborationContentType } from '@common/enums/collaboration.content.type';
import { EntityNotFoundException } from '@common/exceptions';
import { MemoService } from '@domain/common/memo';
import { WhiteboardService } from '@domain/common/whiteboard';
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
  authorizationPolicyId: 'policy-memo',
  storageBucketId: 'bucket-memo',
};
const whiteboardMeta = {
  version: 7,
  contentPointer: 'wb-1',
  authorizationPolicyId: 'policy-wb',
  storageBucketId: 'bucket-wb',
};

describe('CollaborationIntegrationService', () => {
  let service: CollaborationIntegrationService;
  let memoService: {
    getCollaborationMetadata: Mock;
    saveCollaborationMetadata: Mock;
    getProfile: Mock;
  };
  let whiteboardService: {
    getCollaborationMetadata: Mock;
    saveCollaborationMetadata: Mock;
    getProfile: Mock;
  };
  let contributionReporter: {
    memoContribution: Mock;
    whiteboardContribution: Mock;
  };
  let communityResolver: {
    getCommunityForMemoOrFail: Mock;
    getCommunityFromWhiteboardOrFail: Mock;
    getLevelZeroSpaceIdForCommunity: Mock;
  };

  const notFound = () =>
    new EntityNotFoundException('not found', 'MEMOS' as any);

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborationIntegrationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborationIntegrationService);
    memoService = module.get(MemoService) as any;
    whiteboardService = module.get(WhiteboardService) as any;
    contributionReporter = module.get(ContributionReporterService) as any;
    communityResolver = module.get(CommunityResolverService) as any;
  });

  describe('save', () => {
    it('routes a memo save to the memo service with its version + pointer (SC-001)', async () => {
      memoService.saveCollaborationMetadata.mockResolvedValue(undefined);

      const result = await service.save({
        id: 'memo-1',
        contentType: CollaborationContentType.MEMO,
        version: 5,
        contentPointer: 'memo-1',
      });

      expect(result).toEqual({ success: true });
      // The room-owned contract version is forwarded verbatim (FR-004).
      expect(memoService.saveCollaborationMetadata).toHaveBeenCalledWith(
        'memo-1',
        {
          version: 5,
          contentPointer: 'memo-1',
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
      });

      expect(result).toEqual({ success: true });
      expect(whiteboardService.saveCollaborationMetadata).toHaveBeenCalledWith(
        'wb-1',
        {
          version: 2,
          contentPointer: 's3://bucket/wb-1',
        }
      );
    });

    it('rejects an unknown contentType without routing to a write path', async () => {
      const result = await service.save({
        id: 'doc-1',
        contentType: 'bogus' as CollaborationContentType,
        version: 1,
        contentPointer: 'doc-1',
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(CollaborationErrorCode.INTERNAL_ERROR);
    });
  });

  describe('fetch', () => {
    it('returns the memo index (pointer only, no seed bytes) incl. authorizationPolicyId + per-document storageBucketId (FR-005)', async () => {
      memoService.getCollaborationMetadata.mockResolvedValue(memoMeta);

      const result = await service.fetch({ id: 'memo-1' });

      // Index-only: the reply carries the pointer, NOT the blob. The collab
      // service loads the snapshot itself from file-service via contentPointer.
      // The exact-shape assertion guards against a `content` seed field ever
      // creeping back onto the fetch reply.
      expect(result).toEqual({
        found: true,
        contentType: CollaborationContentType.MEMO,
        version: 4,
        contentPointer: 'memo-1',
        authorizationPolicyId: 'policy-memo',
        // The memo's OWN bucket flows through the reply so the collab service
        // persists this doc's snapshot there, not into a flat platform bucket.
        storageBucketId: 'bucket-memo',
      });
    });

    it('falls through to whiteboard when the id is not a memo (incl. its own storageBucketId)', async () => {
      memoService.getCollaborationMetadata.mockRejectedValue(notFound());
      whiteboardService.getCollaborationMetadata.mockResolvedValue(
        whiteboardMeta
      );

      const result = await service.fetch({ id: 'wb-1' });

      expect(result.found).toBe(true);
      expect(result.contentType).toBe(CollaborationContentType.WHITEBOARD);
      expect(result.authorizationPolicyId).toBe('policy-wb');
      // The whiteboard carries its OWN storage bucket, distinct from the memo's.
      expect(result.storageBucketId).toBe('bucket-wb');
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
          authorizationPolicyId: 'policy-memo',
        })
      );

      const N = 17;
      const saveResult = await service.save({
        id: 'memo-rt',
        contentType: CollaborationContentType.MEMO,
        version: N,
        contentPointer: 'memo-rt',
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
          authorizationPolicyId: 'policy-wb',
        })
      );

      await service.save({
        id: 'wb-rt',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 6,
        contentPointer: 'wb-rt',
      });
      await service.save({
        id: 'wb-rt',
        contentType: CollaborationContentType.WHITEBOARD,
        version: 9,
        contentPointer: 'wb-rt',
      });

      const fetchResult = await service.fetch({ id: 'wb-rt' });
      expect(fetchResult.found).toBe(true);
      expect(fetchResult.version).toBe(9);
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

    it('swallows a downstream failure (never throws on the fire-and-forget bus)', async () => {
      // A non-not-found lookup error (or a reporter failure) must not escape the
      // event handler and fail RMQ message handling — like the other methods.
      memoService.getCollaborationMetadata.mockRejectedValue(
        new Error('DB down')
      );

      await expect(
        service.contribution({ id: 'memo-1', users: [{ id: 'u1' }] })
      ).resolves.toBeUndefined();

      expect(contributionReporter.memoContribution).not.toHaveBeenCalled();
    });
  });
});
