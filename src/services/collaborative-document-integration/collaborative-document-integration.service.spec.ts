import { AuthorizationPrivilege } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { MemoService } from '@domain/common/memo';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';
import {
  FetchContentData,
  FetchErrorData,
  SaveContentData,
  SaveErrorData,
} from './outputs';
import { FetchErrorCodes, SaveErrorCodes } from './types';

describe('CollaborativeDocumentIntegrationService', () => {
  let service: CollaborativeDocumentIntegrationService;
  let authorizationService: { isAccessGranted: Mock };
  let actorContextService: { resolveActorContext: Mock };
  let memoService: {
    getMemoOrFail: Mock;
    saveContent: Mock;
    isMultiUser: Mock;
    getProfile: Mock;
  };
  let collaboraDocumentService: {
    getCollaboraDocumentOrFail: Mock;
    getCollaboraDocumentByStorageDocumentId: Mock;
    updateCollaboraDocument: Mock;
  };
  let contributionReporter: {
    memoContribution: Mock;
    officeDocumentContribution: Mock;
    officeDocumentView: Mock;
  };
  let communityResolver: {
    getCommunityForMemoOrFail: Mock;
    getCommunityForCollaboraDocumentOrFail: Mock;
    getLevelZeroSpaceIdForCommunity: Mock;
  };
  let actorLookupService: {
    getActorTypesByIds: Mock;
  };

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'collaboration.memo.max_collaborators_in_room') return 10;
      return undefined;
    }),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborativeDocumentIntegrationService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborativeDocumentIntegrationService);
    authorizationService = module.get(AuthorizationService) as any;
    actorContextService = module.get(ActorContextService) as any;
    memoService = module.get(MemoService) as any;
    collaboraDocumentService = module.get(CollaboraDocumentService) as any;
    contributionReporter = module.get(ContributionReporterService) as any;
    communityResolver = module.get(CommunityResolverService) as any;
    actorLookupService = module.get(ActorLookupService) as any;
  });

  describe('accessGranted', () => {
    it('should return true when user has the requested privilege', async () => {
      const memo = { id: 'memo-1', authorization: 'auth-1' };
      const actorContext = { credentials: [] };
      memoService.getMemoOrFail.mockResolvedValue(memo);
      actorContextService.resolveActorContext.mockResolvedValue(actorContext);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.accessGranted({
        userId: 'user-1',
        documentId: 'memo-1',
        privilege: AuthorizationPrivilege.READ,
      });

      expect(result).toBe(true);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        memo.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('should return false when an exception is thrown', async () => {
      memoService.getMemoOrFail.mockRejectedValue(new Error('Memo not found'));

      const result = await service.accessGranted({
        userId: 'user-1',
        documentId: 'nonexistent',
        privilege: AuthorizationPrivilege.READ,
      });

      expect(result).toBe(false);
    });
  });

  describe('info', () => {
    it('should return all-false when user has no read access', async () => {
      memoService.getMemoOrFail.mockResolvedValue({ authorization: {} });
      actorContextService.resolveActorContext.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result).toEqual({
        read: false,
        update: false,
        isMultiUser: false,
        maxCollaborators: 0,
      });
    });

    it('should return correct info with maxCollaborators based on isMultiUser', async () => {
      const memo = { authorization: 'auth-1' };
      memoService.getMemoOrFail.mockResolvedValue(memo);
      actorContextService.resolveActorContext.mockResolvedValue({});
      // First call: READ -> true, Second call: UPDATE_CONTENT -> true
      authorizationService.isAccessGranted
        .mockReturnValueOnce(true) // READ check in first accessGranted call
        .mockReturnValueOnce(true); // UPDATE_CONTENT check in second accessGranted call
      memoService.isMultiUser.mockResolvedValue(true);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(true);
      expect(result.isMultiUser).toBe(true);
      expect(result.maxCollaborators).toBe(10);
    });

    it('should return maxCollaborators as 1 when not multi-user', async () => {
      memoService.getMemoOrFail.mockResolvedValue({ authorization: {} });
      actorContextService.resolveActorContext.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(true);
      memoService.isMultiUser.mockResolvedValue(false);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result.maxCollaborators).toBe(1);
      expect(result.isMultiUser).toBe(false);
    });
  });

  describe('save', () => {
    it('should return SaveContentData on successful save', async () => {
      memoService.saveContent.mockResolvedValue(undefined);

      const result = await service.save({
        documentId: 'memo-1',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveContentData);
      expect((result.data as SaveContentData).success).toBe(true);
      expect(memoService.saveContent).toHaveBeenCalledWith(
        'memo-1',
        expect.any(Buffer)
      );
    });

    it('should return SaveErrorData with NOT_FOUND code when EntityNotFoundException is thrown', async () => {
      memoService.saveContent.mockRejectedValue(
        new EntityNotFoundException('Memo not found', 'MEMO' as any)
      );

      const result = await service.save({
        documentId: 'nonexistent',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveErrorData);
      expect((result.data as SaveErrorData).code).toBe(
        SaveErrorCodes.NOT_FOUND
      );
    });

    it('should return SaveErrorData with INTERNAL_ERROR code for generic errors', async () => {
      memoService.saveContent.mockRejectedValue(new Error('DB failure'));

      const result = await service.save({
        documentId: 'memo-1',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveErrorData);
      expect((result.data as SaveErrorData).code).toBe(
        SaveErrorCodes.INTERNAL_ERROR
      );
    });
  });

  describe('fetch', () => {
    it('should return FetchContentData with base64 content on success', async () => {
      const content = Buffer.from('test content');
      memoService.getMemoOrFail.mockResolvedValue({
        id: 'memo-1',
        content,
      });

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchContentData);
      expect((result.data as FetchContentData).contentBase64).toBe(
        content.toString('base64')
      );
    });

    it('should return FetchContentData with undefined content when memo content is undefined', async () => {
      memoService.getMemoOrFail.mockResolvedValue({
        id: 'memo-1',
        content: undefined,
      });

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchContentData);
      expect((result.data as FetchContentData).contentBase64).toBeUndefined();
    });

    it('should return FetchErrorData with NOT_FOUND code when EntityNotFoundException is thrown', async () => {
      memoService.getMemoOrFail.mockRejectedValue(
        new EntityNotFoundException('Memo not found', 'MEMO' as any)
      );

      const result = await service.fetch({ documentId: 'nonexistent' } as any);

      expect(result.data).toBeInstanceOf(FetchErrorData);
      expect((result.data as FetchErrorData).code).toBe(
        FetchErrorCodes.NOT_FOUND
      );
    });

    it('should return FetchErrorData with INTERNAL_ERROR code for generic errors', async () => {
      memoService.getMemoOrFail.mockRejectedValue(new Error('DB failure'));

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchErrorData);
      expect((result.data as FetchErrorData).code).toBe(
        FetchErrorCodes.INTERNAL_ERROR
      );
    });
  });

  describe('memoContributions', () => {
    it('should report contributions for each user', async () => {
      communityResolver.getCommunityForMemoOrFail.mockResolvedValue({
        id: 'community-1',
      });
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      memoService.getProfile.mockResolvedValue({ displayName: 'My Memo' });
      contributionReporter.memoContribution.mockReturnValue(undefined);

      await service.memoContributions({
        memoId: 'memo-1',
        users: [{ id: 'user-1' }, { id: 'user-2' }],
      } as any);

      expect(contributionReporter.memoContribution).toHaveBeenCalledTimes(2);
      expect(contributionReporter.memoContribution).toHaveBeenCalledWith(
        { id: 'memo-1', name: 'My Memo', space: 'space-root' },
        { actorID: 'user-1' }
      );
      expect(contributionReporter.memoContribution).toHaveBeenCalledWith(
        { id: 'memo-1', name: 'My Memo', space: 'space-root' },
        { actorID: 'user-2' }
      );
    });
  });

  describe('officeDocumentContributions', () => {
    // The event carries the STORAGE Document id (= collaboraDocument.document.id),
    // NOT the CollaboraDocument id. The service reverse-resolves the
    // CollaboraDocument by its document.id, then indexes under CollaboraDocument.id.
    const STORAGE_DOCUMENT_ID = 'storage-doc-1';
    const COLLABORA_DOCUMENT_ID = 'collabora-doc-1';

    // 012: the consumer resolves each actor id → ActorType once via the tolerant
    // batch lookup, then groups writeActors/readonlyActors by type. Pass the
    // type-by-id map a test wants the lookup to return.
    const arrange = (typeById: Map<string, ActorType> = new Map()) => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        {
          id: COLLABORA_DOCUMENT_ID,
          profile: { displayName: 'My Document' },
        }
      );
      communityResolver.getCommunityForCollaboraDocumentOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      actorLookupService.getActorTypesByIds.mockResolvedValue(typeById);
      contributionReporter.officeDocumentContribution.mockReturnValue(
        undefined
      );
    };

    // a storage documentId comes in → CollaboraDocument is reverse-resolved by
    // document.id → ONE aggregate record indexed under the resolved
    // CollaboraDocument.id, carrying both type-grouped actor sets.
    it('should reverse-resolve by storage document id and index ONE aggregate record under CollaboraDocument.id', async () => {
      arrange(
        new Map([
          ['user-1', ActorType.USER],
          ['user-2', ActorType.USER],
          ['user-3', ActorType.USER],
        ])
      );

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1', 'user-2'],
        readonlyActors: ['user-3'],
      } as any);

      // reverse-resolved by the STORAGE document id
      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).toHaveBeenCalledTimes(1);
      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).toHaveBeenCalledWith(STORAGE_DOCUMENT_ID, {
        relations: { profile: true },
      });

      // community resolution is keyed off the resolved CollaboraDocument id,
      // NOT the incoming storage id
      expect(
        communityResolver.getCommunityForCollaboraDocumentOrFail
      ).toHaveBeenCalledTimes(1);
      expect(
        communityResolver.getCommunityForCollaboraDocumentOrFail
      ).toHaveBeenCalledWith(COLLABORA_DOCUMENT_ID);
      expect(
        communityResolver.getLevelZeroSpaceIdForCommunity
      ).toHaveBeenCalledTimes(1);
      // the resolved community's id is threaded through to the space lookup
      expect(
        communityResolver.getLevelZeroSpaceIdForCommunity
      ).toHaveBeenCalledWith('community-1');

      // ONE aggregate record, id = resolved CollaboraDocument.id (NOT the storage id)
      expect(
        contributionReporter.officeDocumentContribution
      ).toHaveBeenCalledTimes(1);
      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(arg.id).toBe(COLLABORA_DOCUMENT_ID);
      expect(arg.name).toBe('My Document');
      expect(arg.space).toBe('space-root');
      // type-grouped, single-key (all users today). Assert by set membership.
      expect(Object.keys(arg.writeActors)).toEqual([ActorType.USER]);
      expect(arg.writeActors[ActorType.USER]).toEqual(
        expect.arrayContaining(['user-1', 'user-2'])
      );
      expect(arg.writeActors[ActorType.USER]).toHaveLength(2);
      expect(arg.readonlyActors).toEqual({ [ActorType.USER]: ['user-3'] });

      // explicitly: the storage id is never used as the record id
      expect(arg.id).not.toBe(STORAGE_DOCUMENT_ID);
    });

    // SC-001/SC-005: mixed-type write actors are grouped under their distinct,
    // independently-addressable type keys (membership, not order).
    it('should group writeActors by actor type and keep groups independently addressable', async () => {
      arrange(
        new Map([
          ['u1', ActorType.USER],
          ['u2', ActorType.USER],
          ['vc1', ActorType.VIRTUAL_CONTRIBUTOR],
          ['u3', ActorType.USER],
        ])
      );

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['u1', 'vc1', 'u2'],
        readonlyActors: ['u3'],
      } as any);

      // the lookup is consulted ONCE for the union of both sets
      expect(actorLookupService.getActorTypesByIds).toHaveBeenCalledTimes(1);
      const lookupArg = actorLookupService.getActorTypesByIds.mock.calls[0][0];
      expect(lookupArg).toEqual(
        expect.arrayContaining(['u1', 'u2', 'vc1', 'u3'])
      );

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(Object.keys(arg.writeActors)).toEqual(
        expect.arrayContaining([ActorType.USER, ActorType.VIRTUAL_CONTRIBUTOR])
      );
      // distinct keys hold the right ids (segmentability, SC-005)
      expect(arg.writeActors[ActorType.USER]).toEqual(
        expect.arrayContaining(['u1', 'u2'])
      );
      expect(arg.writeActors[ActorType.USER]).toHaveLength(2);
      expect(arg.writeActors[ActorType.VIRTUAL_CONTRIBUTOR]).toEqual(['vc1']);
      expect(arg.readonlyActors).toEqual({ [ActorType.USER]: ['u3'] });
    });

    // SC-002: every actor is a user → a single-key object, never a flat array.
    it('should produce a single-key object when every actor is a user', async () => {
      arrange(
        new Map([
          ['user-1', ActorType.USER],
          ['user-2', ActorType.USER],
        ])
      );

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1', 'user-2'],
        readonlyActors: [],
      } as any);

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(Array.isArray(arg.writeActors)).toBe(false);
      expect(arg.writeActors).toEqual({
        [ActorType.USER]: expect.arrayContaining(['user-1', 'user-2']),
      });
    });

    // FR-003: an empty actor set serializes as {} (empty object), not [] / null.
    it('should index an empty readonlyActors set as {} when none are read-only', async () => {
      arrange(new Map([['user-1', ActorType.USER]]));

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1'],
        readonlyActors: [],
      } as any);

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(arg.readonlyActors).toEqual({});
      expect(arg.writeActors).toEqual({ [ActorType.USER]: ['user-1'] });
    });

    // FR-005: an id the lookup cannot resolve is bucketed under `unknown`,
    // never dropped.
    it('should bucket an unresolvable id under the reserved unknown key', async () => {
      // ghost is absent from the returned map (tolerant lookup omits it)
      arrange(new Map([['user-1', ActorType.USER]]));

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1', 'ghost'],
        readonlyActors: [],
      } as any);

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(arg.writeActors[ActorType.USER]).toEqual(['user-1']);
      expect(arg.writeActors.unknown).toEqual(['ghost']);
    });

    // Each group holds distinct actor_ids (record-shape contract): a repeated
    // id within one set is de-duplicated, not emitted twice.
    it('should de-duplicate a repeated id within a group', async () => {
      arrange(new Map([['user-1', ActorType.USER]]));

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1', 'user-1'],
        readonlyActors: [],
      } as any);

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      expect(arg.writeActors[ActorType.USER]).toEqual(['user-1']);
    });

    // SC-006: the set of recorded ids equals the input — no ids gained or lost
    // by the grouping (an unresolvable id moves to `unknown`, it is not dropped).
    it('should preserve the full input id-set across the type groups (no ids lost)', async () => {
      arrange(
        new Map([
          ['u1', ActorType.USER],
          ['vc1', ActorType.VIRTUAL_CONTRIBUTOR],
        ])
      );

      await service.officeDocumentContributions({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['u1', 'vc1', 'ghost'],
        readonlyActors: ['r-ghost'],
      } as any);

      const arg =
        contributionReporter.officeDocumentContribution.mock.calls[0][0];
      const writeIds = Object.values(arg.writeActors).flat();
      const readIds = Object.values(arg.readonlyActors).flat();
      expect(writeIds).toEqual(expect.arrayContaining(['u1', 'vc1', 'ghost']));
      expect(writeIds).toHaveLength(3);
      expect(readIds).toEqual(['r-ghost']);
    });

    // FR-008: no CollaboraDocument backs the storage document id → discard without throwing
    it('should discard the event without throwing when no CollaboraDocument resolves for the storage document id', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        null
      );

      await expect(
        service.officeDocumentContributions({
          documentId: 'unknown-storage-doc',
          writeActors: ['user-1'],
          readonlyActors: [],
        } as any)
      ).resolves.toBeUndefined();

      // never proceeds to community resolution or reporting
      expect(
        communityResolver.getCommunityForCollaboraDocumentOrFail
      ).not.toHaveBeenCalled();
      expect(
        contributionReporter.officeDocumentContribution
      ).not.toHaveBeenCalled();
    });

    // FR-008: a downstream resolution failure is also discarded without throwing
    it('should discard the event without throwing when the community cannot be resolved', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        { id: COLLABORA_DOCUMENT_ID, profile: { displayName: 'My Document' } }
      );
      communityResolver.getCommunityForCollaboraDocumentOrFail.mockRejectedValue(
        new EntityNotFoundException(
          'Unable to find Space for CollaboraDocument',
          'COMMUNITY' as any
        )
      );

      await expect(
        service.officeDocumentContributions({
          documentId: STORAGE_DOCUMENT_ID,
          writeActors: ['user-1'],
          readonlyActors: [],
        } as any)
      ).resolves.toBeUndefined();

      expect(
        contributionReporter.officeDocumentContribution
      ).not.toHaveBeenCalled();
    });
  });

  // FR-012: companion VIEW consumer — same reverse-resolution path as the
  // contribution consumer, differing ONLY in the reporter method invoked.
  describe('officeDocumentViews', () => {
    const STORAGE_DOCUMENT_ID = 'storage-doc-1';
    const COLLABORA_DOCUMENT_ID = 'collabora-doc-1';

    const arrange = (typeById: Map<string, ActorType> = new Map()) => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        {
          id: COLLABORA_DOCUMENT_ID,
          profile: { displayName: 'My Document' },
        }
      );
      communityResolver.getCommunityForCollaboraDocumentOrFail.mockResolvedValue(
        { id: 'community-1' } as any
      );
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      actorLookupService.getActorTypesByIds.mockResolvedValue(typeById);
      contributionReporter.officeDocumentView.mockReturnValue(undefined);
    };

    // a storage documentId comes in → CollaboraDocument is reverse-resolved
    // by document.id → ONE aggregate VIEW record indexed under the resolved
    // CollaboraDocument.id, carrying both type-grouped actor sets.
    it('should reverse-resolve by storage document id and index ONE aggregate VIEW record under CollaboraDocument.id', async () => {
      arrange(
        new Map([
          ['user-1', ActorType.USER],
          ['user-2', ActorType.USER],
          ['user-3', ActorType.USER],
        ])
      );

      await service.officeDocumentViews({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['user-1', 'user-2'],
        readonlyActors: ['user-3'],
      } as any);

      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).toHaveBeenCalledTimes(1);
      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).toHaveBeenCalledWith(STORAGE_DOCUMENT_ID, {
        relations: { profile: true },
      });

      expect(
        communityResolver.getCommunityForCollaboraDocumentOrFail
      ).toHaveBeenCalledWith(COLLABORA_DOCUMENT_ID);

      // dispatched to the VIEW reporter, NOT the contribution reporter
      expect(contributionReporter.officeDocumentView).toHaveBeenCalledTimes(1);
      expect(
        contributionReporter.officeDocumentContribution
      ).not.toHaveBeenCalled();

      const arg = contributionReporter.officeDocumentView.mock.calls[0][0];
      expect(arg.id).toBe(COLLABORA_DOCUMENT_ID);
      expect(arg.name).toBe('My Document');
      expect(arg.space).toBe('space-root');
      // structural parity with the contribution record: type-grouped sets
      expect(arg.writeActors[ActorType.USER]).toEqual(
        expect.arrayContaining(['user-1', 'user-2'])
      );
      expect(arg.writeActors[ActorType.USER]).toHaveLength(2);
      expect(arg.readonlyActors).toEqual({ [ActorType.USER]: ['user-3'] });

      // the storage id is never used as the record id
      expect(arg.id).not.toBe(STORAGE_DOCUMENT_ID);
    });

    // structural parity (SC-003): the view path groups by type identically to
    // the contribution path, including mixed types and an empty set → {}.
    it('should group view actors by type identically to the contribution record', async () => {
      arrange(
        new Map([
          ['w1', ActorType.USER],
          ['w2', ActorType.VIRTUAL_CONTRIBUTOR],
        ])
      );

      await service.officeDocumentViews({
        documentId: STORAGE_DOCUMENT_ID,
        writeActors: ['w1', 'w2'],
        readonlyActors: [],
      } as any);

      const arg = contributionReporter.officeDocumentView.mock.calls[0][0];
      expect(Object.keys(arg.writeActors)).toEqual(
        expect.arrayContaining([ActorType.USER, ActorType.VIRTUAL_CONTRIBUTOR])
      );
      expect(arg.writeActors[ActorType.USER]).toEqual(['w1']);
      expect(arg.writeActors[ActorType.VIRTUAL_CONTRIBUTOR]).toEqual(['w2']);
      expect(arg.readonlyActors).toEqual({});
    });

    // FR-008: no CollaboraDocument backs the storage document id → discard without throwing
    it('should discard the event without throwing when no CollaboraDocument resolves for the storage document id', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        null
      );

      await expect(
        service.officeDocumentViews({
          documentId: 'unknown-storage-doc',
          writeActors: ['user-1'],
          readonlyActors: [],
        } as any)
      ).resolves.toBeUndefined();

      expect(
        communityResolver.getCommunityForCollaboraDocumentOrFail
      ).not.toHaveBeenCalled();
      expect(contributionReporter.officeDocumentView).not.toHaveBeenCalled();
    });

    // FR-008: a downstream resolution failure is also discarded without throwing
    it('should discard the event without throwing when the community cannot be resolved', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        { id: COLLABORA_DOCUMENT_ID, profile: { displayName: 'My Document' } }
      );
      communityResolver.getCommunityForCollaboraDocumentOrFail.mockRejectedValue(
        new EntityNotFoundException(
          'Unable to find Space for CollaboraDocument',
          'COMMUNITY' as any
        )
      );

      await expect(
        service.officeDocumentViews({
          documentId: STORAGE_DOCUMENT_ID,
          writeActors: ['user-1'],
          readonlyActors: [],
        } as any)
      ).resolves.toBeUndefined();

      expect(contributionReporter.officeDocumentView).not.toHaveBeenCalled();
    });
  });

  describe('officeDocumentRename', () => {
    const STORAGE_DOCUMENT_ID = 'storage-doc-1';
    const COLLABORA_DOCUMENT_ID = 'collabora-doc-1';

    it('reverse-resolves by storage document id and renames the CollaboraDocument', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        { id: COLLABORA_DOCUMENT_ID }
      );
      collaboraDocumentService.updateCollaboraDocument.mockResolvedValue(
        {} as any
      );

      await service.officeDocumentRename({
        documentId: STORAGE_DOCUMENT_ID,
        displayName: 'Renamed doc',
      } as any);

      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).toHaveBeenCalledWith(STORAGE_DOCUMENT_ID);
      expect(
        collaboraDocumentService.updateCollaboraDocument
      ).toHaveBeenCalledWith(COLLABORA_DOCUMENT_ID, 'Renamed doc');
    });

    it('ignores a blank displayName without touching the document (never blanks the name)', async () => {
      await service.officeDocumentRename({
        documentId: STORAGE_DOCUMENT_ID,
        displayName: '   ',
      } as any);

      expect(
        collaboraDocumentService.getCollaboraDocumentByStorageDocumentId
      ).not.toHaveBeenCalled();
      expect(
        collaboraDocumentService.updateCollaboraDocument
      ).not.toHaveBeenCalled();
    });

    it('discards the event without renaming when no CollaboraDocument is backed by the storage id', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        null
      );

      await expect(
        service.officeDocumentRename({
          documentId: 'missing',
          displayName: 'X',
        } as any)
      ).resolves.toBeUndefined();

      expect(
        collaboraDocumentService.updateCollaboraDocument
      ).not.toHaveBeenCalled();
    });

    it('swallows a rename failure (best-effort, does not throw)', async () => {
      collaboraDocumentService.getCollaboraDocumentByStorageDocumentId.mockResolvedValue(
        { id: COLLABORA_DOCUMENT_ID }
      );
      collaboraDocumentService.updateCollaboraDocument.mockRejectedValue(
        new Error('boom')
      );

      await expect(
        service.officeDocumentRename({
          documentId: STORAGE_DOCUMENT_ID,
          displayName: 'Renamed doc',
        } as any)
      ).resolves.toBeUndefined();
    });
  });
});
