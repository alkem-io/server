import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaborationLifecycleService } from '@domain/common/collaboration-metadata';
import { ILicense } from '@domain/common/license/license.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { actorContextData } from '@test/data/actorContext.mock';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import * as Y from 'yjs';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { LicenseService } from '../license/license.service';
import { ProfileService } from '../profile/profile.service';
import { Whiteboard } from './whiteboard.entity';
import * as whiteboardFork from './whiteboard.fork';
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardService } from './whiteboard.service';

// The authorized actor for every create in these tests (GLOBAL_ADMIN; real UUID).
const actorContext = actorContextData.actorContext;
// An anonymous context: actorID defaults to '' → createdBy must resolve to undefined.
const anonymousActorContext = { ...actorContext, actorID: '' } as ActorContext;

/**
 * Seed a base64 Yjs-V2 snapshot whose asset map (`FILES`) holds opaque file-service
 * locator STRINGS keyed by fileId — the schema `rehomeSnapshotAssets` re-homes. Built
 * through the real fork's `writeAssetLocators` so it round-trips exactly as production reads.
 */
const buildAssetSnapshotBase64 = async (
  locators: Record<string, string>
): Promise<string> => {
  const fork: any = await import('@excalidraw-yjs/element/headless');
  const doc = new Y.Doc();
  doc.transact(() => {
    fork.writeAssetLocators(doc.getMap(fork.FILES), locators, { prune: true });
  }, fork.LOCAL_ORIGIN);
  const b64 = Buffer.from(Y.encodeStateAsUpdateV2(doc)).toString('base64');
  doc.destroy();
  return b64;
};

/**
 * Seed a base64 Yjs-V2 snapshot containing one IMAGE element (through the real fork
 * Scene) that references `fileId`, optionally with a matching asset locator, and
 * optionally tombstoned. Exercises the desired-snapshot element↔asset preflight.
 */
const buildImageSnapshotBase64 = async (opts: {
  fileId: string;
  assetLocator?: string;
  deleted?: boolean;
}): Promise<string> => {
  const fork: any = await import('@excalidraw-yjs/element/headless');
  const doc = new Y.Doc();
  const scene = new fork.Scene(undefined, { doc });
  const img = fork.newElement({
    type: 'image',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  });
  scene.insertElement(img);
  scene.mutateElement(img, { fileId: opts.fileId });
  if (opts.deleted) {
    scene.mutateElement(img, { isDeleted: true });
  }
  if (opts.assetLocator != null) {
    doc.transact(() => {
      fork.writeAssetLocators(
        doc.getMap(fork.FILES),
        { [opts.fileId]: opts.assetLocator },
        { prune: true }
      );
    }, fork.LOCAL_ORIGIN);
  }
  const b64 = Buffer.from(Y.encodeStateAsUpdateV2(doc)).toString('base64');
  doc.destroy();
  return b64;
};

/**
 * Seed a base64 Yjs-V2 snapshot containing a single non-image shape (rectangle) and
 * NO assets — a snapshot whose bytes are DISTINCT from an empty/placeholder doc, so a
 * "seeded from the source's stored bytes, not a fresh empty doc" assertion is discriminating.
 */
const buildShapeSnapshotBase64 = async (): Promise<string> => {
  const fork: any = await import('@excalidraw-yjs/element/headless');
  const doc = new Y.Doc();
  const scene = new fork.Scene(undefined, { doc });
  const rect = fork.newElement({
    type: 'rectangle',
    x: 5,
    y: 5,
    width: 40,
    height: 30,
  });
  scene.insertElement(rect);
  const b64 = Buffer.from(Y.encodeStateAsUpdateV2(doc)).toString('base64');
  doc.destroy();
  return b64;
};

/**
 * Build a base64-encoded Yjs-V2 whiteboard snapshot with a RAW `FILES` map — used to
 * inject values the locator-native re-home does NOT expect (e.g. a non-string
 * BinaryFileData-shaped object), so a "loud on non-string" assertion is discriminating.
 * For well-formed locator-string snapshots use `buildAssetSnapshotBase64` instead.
 */
const buildSnapshotBase64 = (files: Record<string, unknown> = {}): string => {
  const doc = new Y.Doc();
  const filesMap = doc.getMap<unknown>('files');
  for (const [key, value] of Object.entries(files)) {
    filesMap.set(key, value);
  }
  const snapshot = Buffer.from(Y.encodeStateAsUpdateV2(doc));
  doc.destroy();
  return snapshot.toString('base64');
};

/**
 * Decode a stored Yjs-V2 snapshot and read its FILES asset-locator map back through the
 * REAL fork — lets a test assert the update path actually re-homed/rewrote the locators
 * that landed in storage (the discriminating check the old no-op path could never pass).
 */
const readSnapshotAssetLocators = async (
  snapshot: Uint8Array
): Promise<Record<string, string>> => {
  const fork: any = await import('@excalidraw-yjs/element/headless');
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, snapshot);
  const locators = fork.readAssetLocators(doc.getMap(fork.FILES)) as Record<
    string,
    string
  >;
  doc.destroy();
  return locators;
};

describe('WhiteboardService', () => {
  let service: WhiteboardService;
  let whiteboardRepository: MockType<Repository<Whiteboard>>;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let collaborationLifecycleService: CollaborationLifecycleService;
  let communityResolverService: CommunityResolverService;
  let licenseService: LicenseService;
  let fileServiceAdapter: FileServiceAdapter;
  let authorizationService: AuthorizationService;
  let documentService: DocumentService;
  let storageBucketService: StorageBucketService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // The service loads the ESM headless fork via a Function-wrapped dynamic import
    // that vitest's module runner cannot drive. Spy on the SHARED module export (NOT
    // vi.mock — the test suite runs with `isolate: false`, so whiteboard.service.ts is
    // usually already cached real by an earlier spec and a late module-mock is bypassed;
    // spying the live export mutates the one shared instance every caller resolves).
    // The substitute is a plain dynamic import, so createWhiteboard exercises the REAL
    // fork (asset/element schema) against a real Y.Doc — the same fork client-web consumes.
    vi.spyOn(whiteboardFork, 'loadWhiteboardFork').mockImplementation(
      () => import('@excalidraw-yjs/element/headless') as any
    );

    // Mock static Whiteboard.create to avoid DataSource requirement
    vi.spyOn(Whiteboard, 'create').mockImplementation((input: any) => {
      const entity = new Whiteboard();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardService,
        repositoryProviderMockFactory(Whiteboard),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(WhiteboardService);
    whiteboardRepository = module.get(getRepositoryToken(Whiteboard));
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    collaborationLifecycleService = module.get(CollaborationLifecycleService);
    communityResolverService = module.get(CommunityResolverService);
    licenseService = module.get(LicenseService);
    fileServiceAdapter = module.get(FileServiceAdapter);
    authorizationService = module.get(AuthorizationService);
    documentService = module.get(DocumentService);
    storageBucketService = module.get(StorageBucketService);
  });

  describe('createWhiteboard', () => {
    const mockStorageAggregator = {} as IStorageAggregator;
    const mockProfile = {
      id: 'profile-1',
      displayName: 'Whiteboard',
      // The whiteboard's own bucket — Phase 3 of createWhiteboard writes the
      // initial scene's Yjs-V2 snapshot here when creation content is non-empty
      // (006-collab-content-unification).
      storageBucket: { id: 'sb-1' },
    } as unknown as IProfile;

    // Create content is a base64 Yjs-V2 snapshot (006-collab-content-unification —
    // no Excalidraw JSON). An empty `Y.Doc` is the smallest valid, openable
    // snapshot (Phase 3 applies it via `applyUpdateV2`); a non-base64 string like
    // '{}' would fail to decode.
    const validEmptyContent = Buffer.from(
      Y.encodeStateAsUpdateV2(new Y.Doc())
    ).toString('base64');

    beforeEach(() => {
      vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        {} as any
      );
      // createWhiteboard saves+materializes internally; round-trip the
      // entity so the test sees the same in-memory state we set up.
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      vi.mocked(
        profileService.materializeProfileContentAndVisualsOrRollback
      ).mockImplementation(async profile => profile);
      // Creation content is converted to a Yjs-V2 snapshot and written to the
      // whiteboard's bucket; the returned id becomes the contentPointer.
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-1',
        externalID: 'ext-1',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });
    });

    it('should create whiteboard with profile, visuals, tagset, and authorization', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator,
        actorContext
      );

      expect(result.authorization).toBeDefined();
      expect(result.authorization!.type).toBe(
        AuthorizationPolicyType.WHITEBOARD
      );
      expect(result.contentUpdatePolicy).toBe(ContentUpdatePolicy.CONTRIBUTORS);
      expect(result.profile).toEqual(
        expect.objectContaining({ id: 'profile-1' })
      );

      expect(vi.mocked(profileService.createProfile)).toHaveBeenCalledWith(
        { displayName: 'Whiteboard' },
        ProfileType.WHITEBOARD,
        mockStorageAggregator
      );
      expect(
        vi.mocked(profileService.materializeProfileContentAndVisualsOrRollback)
      ).toHaveBeenCalledWith(
        mockProfile,
        undefined,
        [VisualType.CARD, VisualType.WHITEBOARD_PREVIEW],
        expect.any(Function)
      );
      expect(
        vi.mocked(profileService.addOrUpdateTagsetOnProfile)
      ).toHaveBeenCalledWith(mockProfile, {
        name: TagsetReservedName.DEFAULT,
        tags: [],
      });
    });

    it('should set createdBy from the actor context actorID', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator,
        actorContext
      );

      expect(result.createdBy).toBe(actorContext.actorID);
    });

    it('should leave createdBy undefined for an anonymous actor (empty actorID)', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator,
        anonymousActorContext
      );

      expect(result.createdBy).toBeUndefined();
    });

    it('should use default preview coordinates as null when not provided', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator,
        actorContext
      );

      expect(result.previewSettings).toEqual({
        mode: WhiteboardPreviewMode.AUTO,
        coordinates: null,
      });
    });

    it('should use provided preview settings when specified', async () => {
      const coordinates = { x: 10, y: 20, width: 100, height: 200 };
      const result = await service.createWhiteboard(
        {
          content: validEmptyContent,
          previewSettings: {
            mode: WhiteboardPreviewMode.CUSTOM,
            coordinates,
          },
        },
        mockStorageAggregator,
        actorContext
      );

      expect(result.previewSettings).toEqual({
        mode: WhiteboardPreviewMode.CUSTOM,
        coordinates,
      });
    });

    it('should use custom profile data when provided', async () => {
      const customProfile = {
        displayName: 'My Whiteboard',
        description: 'A custom whiteboard',
      };

      await service.createWhiteboard(
        { content: validEmptyContent, profile: customProfile },
        mockStorageAggregator,
        actorContext
      );

      expect(vi.mocked(profileService.createProfile)).toHaveBeenCalledWith(
        customProfile,
        ProfileType.WHITEBOARD,
        mockStorageAggregator
      );
    });
  });

  describe('getWhiteboardOrFail', () => {
    it('should return whiteboard when found', async () => {
      const whiteboard = { id: 'wb-1' } as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      const result = await service.getWhiteboardOrFail('wb-1');

      expect(result).toBe(whiteboard);
      expect(whiteboardRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'wb-1' } })
      );
    });

    it('should throw EntityNotFoundException when not found', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(null);

      await expect(service.getWhiteboardOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass additional options to repository', async () => {
      const whiteboard = { id: 'wb-1' } as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      await service.getWhiteboardOrFail('wb-1', {
        relations: { profile: true },
      });

      expect(whiteboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wb-1' },
        relations: { profile: true },
      });
    });
  });

  describe('deleteWhiteboard', () => {
    it('should cascade delete profile and authorization then remove whiteboard', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);
      vi.mocked(profileService.deleteProfile).mockResolvedValue(
        whiteboard.profile as any
      );
      vi.mocked(authorizationPolicyService.delete).mockResolvedValue({} as any);

      // deleteWhiteboard removes the leaf and enqueues `document.deleted` in one
      // transaction (lifecycle outbox). Run the callback with a transactional
      // manager whose remove() returns the removed entity.
      const txManager = {
        remove: vi.fn().mockResolvedValue({} as Whiteboard),
      };
      // `manager` is a readonly property on Repository; assign through a cast.
      (whiteboardRepository as unknown as { manager: unknown }).manager = {
        transaction: vi.fn(async (cb: any) => cb(txManager)),
      };

      const result = await service.deleteWhiteboard('wb-1');

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'profile-1'
      );
      expect(vi.mocked(authorizationPolicyService.delete)).toHaveBeenCalledWith(
        whiteboard.authorization
      );
      expect(txManager.remove).toHaveBeenCalledWith(whiteboard);
      expect(
        collaborationLifecycleService.enqueueDocumentDeleted
      ).toHaveBeenCalledWith(txManager, 'wb-1');
      expect(result.id).toBe('wb-1');
    });

    it('should throw RelationshipNotFoundException when profile is not loaded', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      await expect(service.deleteWhiteboard('wb-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when authorization is not loaded', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1' },
        authorization: undefined,
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      await expect(service.deleteWhiteboard('wb-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw EntityNotFoundException when whiteboard does not exist', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(null);

      await expect(service.deleteWhiteboard('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateWhiteboard', () => {
    const existingWhiteboard = {
      id: 'wb-1',
      profile: { id: 'profile-1' },
      contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      previewSettings: {
        mode: WhiteboardPreviewMode.AUTO,
        coordinates: null,
      },
    } as unknown as IWhiteboard;

    beforeEach(() => {
      whiteboardRepository.findOne!.mockResolvedValue(existingWhiteboard);
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
    });

    it('should update profile when profile data is provided', async () => {
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      vi.mocked(profileService.updateProfile).mockResolvedValue(
        updatedProfile as any
      );

      const result = await service.updateWhiteboard(existingWhiteboard, {
        profile: { displayName: 'Updated' },
      });

      expect(vi.mocked(profileService.updateProfile)).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        { displayName: 'Updated' }
      );
      expect(result.profile).toEqual(
        expect.objectContaining({ id: 'profile-1' })
      );
    });

    it('should not update profile when profile data is not provided', async () => {
      await service.updateWhiteboard(existingWhiteboard, {});

      expect(vi.mocked(profileService.updateProfile)).not.toHaveBeenCalled();
    });

    it('should update contentUpdatePolicy when provided', async () => {
      const result = await service.updateWhiteboard(existingWhiteboard, {
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      expect(result.contentUpdatePolicy).toBe(ContentUpdatePolicy.ADMINS);
    });

    it('should update preview settings mode when provided', async () => {
      const result = await service.updateWhiteboard(existingWhiteboard, {
        previewSettings: { mode: WhiteboardPreviewMode.FIXED },
      });

      expect(result.previewSettings.mode).toBe(WhiteboardPreviewMode.FIXED);
    });

    it('should update preview settings coordinates when provided', async () => {
      const coordinates = { x: 50, y: 60, width: 300, height: 200 };

      const result = await service.updateWhiteboard(existingWhiteboard, {
        previewSettings: { coordinates },
      });

      expect(result.previewSettings.coordinates).toEqual(coordinates);
    });

    it('should save updated whiteboard via repository', async () => {
      await service.updateWhiteboard(existingWhiteboard, {
        contentUpdatePolicy: ContentUpdatePolicy.OWNER,
      });

      expect(whiteboardRepository.save).toHaveBeenCalled();
    });
  });

  describe('isMultiUser', () => {
    it('should return true when multi-user entitlement is enabled', async () => {
      const mockLicense = { id: 'license-1' } as ILicense;
      vi.mocked(
        communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
      ).mockResolvedValue(mockLicense);
      vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(true);

      const result = await service.isMultiUser('wb-1');

      expect(result).toBe(true);
      expect(
        vi.mocked(
          communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
        )
      ).toHaveBeenCalledWith('wb-1');
      expect(
        vi.mocked(licenseService.isEntitlementEnabled)
      ).toHaveBeenCalledWith(
        mockLicense,
        LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER
      );
    });

    it('should return false when multi-user entitlement is not enabled', async () => {
      const mockLicense = { id: 'license-1' } as ILicense;
      vi.mocked(
        communityResolverService.getCollaborationLicenseFromWhiteboardOrFail
      ).mockResolvedValue(mockLicense);
      vi.mocked(licenseService.isEntitlementEnabled).mockReturnValue(false);

      const result = await service.isMultiUser('wb-1');

      expect(result).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return profile when initialized', async () => {
      const whiteboardWithProfile = {
        id: 'wb-1',
        profile: { id: 'profile-1', displayName: 'Test' },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboardWithProfile);

      const result = await service.getProfile('wb-1');

      expect(result).toEqual(
        expect.objectContaining({ id: 'profile-1', displayName: 'Test' })
      );
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const whiteboardNoProfile = {
        id: 'wb-1',
        profile: undefined,
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboardNoProfile);

      await expect(service.getProfile('wb-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should merge additional relations when provided', async () => {
      const whiteboardWithProfile = {
        id: 'wb-1',
        profile: { id: 'profile-1' },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboardWithProfile);

      await service.getProfile('wb-1', {
        framing: true,
      } as any);

      expect(whiteboardRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wb-1' },
        relations: {
          profile: true,
          framing: true,
        },
      });
    });

    it('should throw EntityNotFoundException when whiteboard does not exist', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('save', () => {
    it('should delegate to repository save', async () => {
      const whiteboard = { id: 'wb-1' } as IWhiteboard;
      whiteboardRepository.save!.mockResolvedValue(whiteboard);

      const result = await service.save(whiteboard);

      expect(result).toBe(whiteboard);
      expect(whiteboardRepository.save).toHaveBeenCalledWith(whiteboard);
    });
  });

  describe('updateWhiteboardContent', () => {
    const loadedWhiteboard = () =>
      ({
        id: 'wb-1',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      }) as unknown as Whiteboard;

    const mockStoredSnapshot = () => {
      const captured: { buffer?: Uint8Array } = {};
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockImplementation(
        async (buf: any) => {
          captured.buffer = buf;
          return {
            id: 'snap-1',
            externalID: 'ext-1',
            mimeType: 'application/octet-stream',
            size: 1,
            reused: false,
          };
        }
      );
      return captured;
    };

    it('re-homes through the authorized locator-native path and saves the snapshot', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      mockStoredSnapshot();

      // No assets → rehomeSnapshotAssets returns the snapshot verbatim, no copy/authz.
      const result = await service.updateWhiteboardContent(
        'wb-1',
        await buildAssetSnapshotBase64({}),
        actorContext
      );

      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sb-1'
      );
      expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
      expect(result.contentPointer).toBe('snap-1');
      expect(whiteboardRepository.save).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when profile not initialized', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        profile: undefined,
      } as unknown as Whiteboard);

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({}),
          actorContext
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('RED: copies a FOREIGN-bucket locator into the whiteboard bucket and REWRITES the stored map (no silent no-op)', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      // The referenced media document lives in a DIFFERENT bucket than the whiteboard.
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      const captured = mockStoredSnapshot();

      await service.updateWhiteboardContent(
        'wb-1',
        await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
        actorContext
      );

      // Per-document READ authorized under the initiating actor, then copied into the
      // whiteboard's OWN bucket as a target-owned copy (skipDedup=true).
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.objectContaining({ id: 'doc-auth' }),
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
        'sb-1',
        expect.objectContaining({ id: 'src-loc' }),
        actorContext.actorID,
        true
      );
      // The STORED snapshot's asset map now points at the copied locator — the exact
      // behaviour the BinaryFileData-shaped no-op path silently skipped.
      expect(await readSnapshotAssetLocators(captured.buffer!)).toEqual({
        'file-1': 'copied-loc',
      });
      // Success path: the new media/checkpoint are NOT cleaned up (no previous pointer here).
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('leaves a TARGET-OWNED locator unchanged (no copy, retained in the stored map)', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      // The referenced document already lives in the whiteboard's own bucket.
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'owned-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-1' },
      } as any);
      const captured = mockStoredSnapshot();

      await service.updateWhiteboardContent(
        'wb-1',
        await buildAssetSnapshotBase64({ 'file-1': 'owned-loc' }),
        actorContext
      );

      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(await readSnapshotAssetLocators(captured.buffer!)).toEqual({
        'file-1': 'owned-loc',
      });
    });

    it('RED: deletes the copied locator and does not save when the checkpoint write fails', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockRejectedValue(
        new Error('checkpoint write failed')
      );

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
          actorContext
        )
      ).rejects.toThrow('checkpoint write failed');
      // The copied target-owned media is cleaned up; the entity is never saved.
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'copied-loc'
      );
      expect(whiteboardRepository.save).not.toHaveBeenCalled();
    });

    it('RED: deletes the copied locator AND the new checkpoint when the entity save fails; previous pointer remains', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: 'prev-ptr',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'new-snap',
        externalID: 'ext',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });
      whiteboardRepository.save!.mockRejectedValue(new Error('save failed'));

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
          actorContext
        )
      ).rejects.toThrow('save failed');
      // Both the copied media and the freshly-written checkpoint are cleaned up ...
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'copied-loc'
      );
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'new-snap'
      );
      // ... but the previous durable pointer is NEVER deleted (it stays the owner).
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalledWith(
        'prev-ptr'
      );
    });

    it('RED: does NOT delete a REUSED checkpoint on save failure — an unchanged update that dedups to the previous pointer keeps it durable', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: 'prev-ptr',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      // Unchanged content dedups back to the CURRENT durable checkpoint (reused:true).
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'prev-ptr',
        externalID: 'ext',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: true,
      });
      whiteboardRepository.save!.mockRejectedValue(new Error('save failed'));

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
          actorContext
        )
      ).rejects.toThrow('save failed');
      // The copied (skipDedup) media is still cleaned up ...
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'copied-loc'
      );
      // ... but the REUSED checkpoint (== the durable previous pointer) is NEVER deleted.
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalledWith(
        'prev-ptr'
      );
    });

    it('RED: does NOT delete a REUSED checkpoint owned by another row on save failure', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: 'prev-ptr',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard);
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      // The new snapshot content-dedups to a shared row owned elsewhere (reused:true).
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'shared-row',
        externalID: 'ext',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: true,
      });
      whiteboardRepository.save!.mockRejectedValue(new Error('save failed'));

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
          actorContext
        )
      ).rejects.toThrow('save failed');
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'copied-loc'
      );
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalledWith(
        'shared-row'
      );
    });

    it('preserves the original error when compensation cleanup also fails', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'src-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copied-loc',
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockRejectedValue(
        new Error('original checkpoint failure')
      );
      vi.mocked(fileServiceAdapter.deleteDocument).mockRejectedValue(
        new Error('cleanup also failed')
      );

      // The ORIGINAL error propagates, not the swallowed cleanup error.
      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'src-loc' }),
          actorContext
        )
      ).rejects.toThrow('original checkpoint failure');
    });

    it('RED: rejects an UNAUTHORIZED locator BEFORE any copy or snapshot write', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'foreign-loc',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);
      // The initiating actor lacks READ on the referenced document.
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new ForbiddenException('denied', 'test' as any);
        }
      );

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'foreign-loc' }),
          actorContext
        )
      ).rejects.toThrow(ForbiddenException);
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('RED: is LOUD on a non-string FILES value — never silently no-ops the way the old path did', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());

      // A BinaryFileData-shaped object in the FILES map is exactly what the deleted
      // reupload path silently accepted; readAssetLocators must reject it loudly.
      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          buildSnapshotBase64({
            'file-1': { id: 'file-1', url: 'http://x/y.png' },
          }),
          actorContext
        )
      ).rejects.toThrow();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('should still write a snapshot when there are no assets', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(loadedWhiteboard());
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      mockStoredSnapshot();

      const result = await service.updateWhiteboardContent(
        'wb-1',
        await buildAssetSnapshotBase64({}),
        actorContext
      );

      expect(result.contentPointer).toBe('snap-1');
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when storageBucket not found', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        profile: { id: 'profile-1' },
      } as unknown as Whiteboard);

      await expect(
        service.updateWhiteboardContent(
          'wb-1',
          await buildAssetSnapshotBase64({ 'file-1': 'loc-1' }),
          actorContext
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getWhiteboardContent', () => {
    it('returns the stored snapshot as base64 read from the bucket by contentPointer', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: 'snap-ptr',
      } as unknown as Whiteboard);
      const contentBase64 = Buffer.from('yjs-v2-bytes').toString('base64');
      vi.mocked(fileServiceAdapter.getContentBatch).mockResolvedValue([
        { id: 'snap-ptr', found: true, contentBase64 },
      ]);

      const result = await service.getWhiteboardContent('wb-1');

      // Returned verbatim — the content stays an opaque base64 Yjs-V2 snapshot.
      expect(result).toBe(contentBase64);
      expect(fileServiceAdapter.getContentBatch).toHaveBeenCalledWith([
        'snap-ptr',
      ]);
    });

    it('returns "" when the whiteboard was never edited (no contentPointer) without reading file-service', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: undefined,
      } as unknown as Whiteboard);

      const result = await service.getWhiteboardContent('wb-1');

      expect(result).toBe('');
      expect(fileServiceAdapter.getContentBatch).not.toHaveBeenCalled();
    });

    it('returns "" when the snapshot pointer resolves to a missing blob', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-1',
        contentPointer: 'snap-ptr',
      } as unknown as Whiteboard);
      vi.mocked(fileServiceAdapter.getContentBatch).mockResolvedValue([
        { id: 'snap-ptr', found: false, error: 'not found' },
      ]);

      const result = await service.getWhiteboardContent('wb-1');

      expect(result).toBe('');
    });

    it('throws EntityNotFoundException when the whiteboard does not exist', async () => {
      whiteboardRepository.findOne!.mockResolvedValue(null);

      await expect(service.getWhiteboardContent('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('createWhiteboard — source-clone authz + asset re-home (006 write-path security)', () => {
    const mockStorageAggregator = {} as IStorageAggregator;
    const TARGET_BUCKET = 'sb-target';
    const SOURCE_BUCKET = 'sb-source';
    const mockProfile = {
      id: 'profile-new',
      displayName: 'Whiteboard Template',
      storageBucket: { id: TARGET_BUCKET },
    } as unknown as IProfile;

    // A real, openable empty Yjs-V2 snapshot (no assets, no elements → rehome is a
    // verbatim pass-through).
    const emptySnapshotBase64 = Buffer.from(
      Y.encodeStateAsUpdateV2(new Y.Doc())
    ).toString('base64');

    beforeEach(() => {
      vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        {} as any
      );
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);
      vi.mocked(
        profileService.materializeProfileContentAndVisualsOrRollback
      ).mockImplementation(async profile => profile);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-new',
        externalID: 'ext-new',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });
      // Default: the freshly-created whiteboard, so the Phase-3 rollback path
      // (deleteWhiteboard on a re-home failure) can resolve+cascade cleanly.
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'wb-new',
        authorization: { id: 'wb-auth' },
        profile: { id: 'profile-new', storageBucket: { id: TARGET_BUCKET } },
      } as unknown as Whiteboard);
      vi.mocked(profileService.deleteProfile).mockResolvedValue({} as any);
      vi.mocked(authorizationPolicyService.delete).mockResolvedValue({} as any);
      (whiteboardRepository as unknown as { manager: unknown }).manager = {
        transaction: vi.fn(async (cb: any) =>
          cb({ remove: vi.fn().mockResolvedValue({}) })
        ),
      };
    });

    // Configure the SOURCE whiteboard a clone dereferences. A single object serves
    // both the source-load (needs authorization + profile.storageBucket) and the
    // getWhiteboardContent pointer read.
    const mockSource = (opts: { contentPointer?: string } = {}) => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'source-wb',
        authorization: { id: 'source-auth' },
        profile: { storageBucket: { id: SOURCE_BUCKET } },
        contentPointer: opts.contentPointer,
      } as unknown as Whiteboard);
    };

    // --- XOR: content and sourceWhiteboardID are mutually exclusive by PRESENCE ---
    it('rejects a create that supplies BOTH content and sourceWhiteboardID, before any side effect', async () => {
      await expect(
        service.createWhiteboard(
          { content: emptySnapshotBase64, sourceWhiteboardID: 'source-wb' },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
      expect(profileService.createProfile).not.toHaveBeenCalled();
      expect(whiteboardRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects when the extra content is an encoded-empty string (present, not truthy)', async () => {
      await expect(
        service.createWhiteboard(
          { content: '', sourceWhiteboardID: 'source-wb' },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
      expect(profileService.createProfile).not.toHaveBeenCalled();
    });

    // --- Path A: source clone authorizes READ on the dereferenced source ---
    it('authorizes READ on the source whiteboard, then seeds the new bucket from the source snapshot', async () => {
      mockSource({ contentPointer: 'source-ptr' });
      // Distinctive (non-empty) source bytes so "seeded from source, not a fresh empty
      // placeholder doc" is actually discriminating (the shape carries no assets, so
      // rehome is a verbatim pass-through).
      const sourceContent = await buildShapeSnapshotBase64();
      vi.mocked(fileServiceAdapter.getContentBatch).mockResolvedValue([
        { id: 'source-ptr', found: true, contentBase64: sourceContent },
      ]);

      const result = await service.createWhiteboard(
        {
          sourceWhiteboardID: 'source-wb',
          profile: { displayName: 'Whiteboard Template' },
        },
        mockStorageAggregator,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.objectContaining({ id: 'source-auth' }),
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      expect(fileServiceAdapter.getContentBatch).toHaveBeenCalledWith([
        'source-ptr',
      ]);
      const [writtenSnapshot, bucketId] = vi.mocked(
        fileServiceAdapter.createSnapshotInBucket
      ).mock.calls[0];
      expect(bucketId).toBe(TARGET_BUCKET);
      expect(Buffer.from(writtenSnapshot).toString('base64')).toBe(
        sourceContent
      );
      expect(sourceContent).not.toBe(emptySnapshotBase64);
      expect(result.contentPointer).toBe('snap-new');
    });

    it('rejects the clone when the actor lacks READ on the source — no profile created, no snapshot written', async () => {
      mockSource({ contentPointer: 'source-ptr' });
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new ForbiddenException('denied', 'test' as any);
        }
      );

      await expect(
        service.createWhiteboard(
          { sourceWhiteboardID: 'source-wb' },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ForbiddenException);
      expect(profileService.createProfile).not.toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('RED: a source whose storage bucket is unresolved fails closed (never downgrades the clone media gate)', async () => {
      // Source authorized, but its profile.storageBucket did not resolve → the strict
      // source-bucket media constraint is unenforceable, so the clone must abort rather
      // than silently fall through to the untrusted per-document branch.
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'source-wb',
        authorization: { id: 'source-auth' },
        profile: {},
        contentPointer: 'source-ptr',
      } as unknown as Whiteboard);

      await expect(
        service.createWhiteboard(
          { sourceWhiteboardID: 'source-wb' },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(EntityNotInitializedException);
      // Aborts after the source READ but before reading source content or creating anything.
      expect(fileServiceAdapter.getContentBatch).not.toHaveBeenCalled();
      expect(profileService.createProfile).not.toHaveBeenCalled();
    });

    it('seeds the canonical empty snapshot when the source has no stored content (no fallback to any client content)', async () => {
      mockSource({ contentPointer: undefined });

      const result = await service.createWhiteboard(
        { sourceWhiteboardID: 'source-wb' },
        mockStorageAggregator,
        actorContext
      );

      // Release A: EVERY create seeds a real snapshot — a source with no stored
      // content seeds the CANONICAL EMPTY Y.Doc (never a fallback to client
      // content), so the new row carries a real, resolving contentPointer (never
      // NULL / dangling). The admission-pointer invariant for Release B.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledTimes(
        1
      );
      expect(result.contentPointer).toBe('snap-new');
    });

    it('does not dereference any source when sourceWhiteboardID is absent (direct-content path)', async () => {
      const result = await service.createWhiteboard(
        { content: emptySnapshotBase64, profile: { displayName: 'x' } },
        mockStorageAggregator,
        actorContext
      );

      expect(fileServiceAdapter.getContentBatch).not.toHaveBeenCalled();
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(result.contentPointer).toBe('snap-new');
    });

    // --- Asset re-home authorization (the exfiltration boundary) ---
    it('RED: a source-clone locator pointing outside the source bucket is rejected — zero copies, zero persistence', async () => {
      mockSource({ contentPointer: 'source-ptr' });
      const sourceWithAsset = await buildAssetSnapshotBase64({
        'file-1': 'loc-1',
      });
      vi.mocked(fileServiceAdapter.getContentBatch).mockResolvedValue([
        { id: 'source-ptr', found: true, contentBase64: sourceWithAsset },
      ]);
      // The referenced document lives in a DIFFERENT bucket than the authorized source.
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'loc-1',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-foreign' },
      } as any);

      await expect(
        service.createWhiteboard(
          { sourceWhiteboardID: 'source-wb' },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ForbiddenException);
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('retains a locator already in the target bucket without copying it', async () => {
      const content = await buildAssetSnapshotBase64({ 'file-1': 'loc-1' });
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'loc-1',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: TARGET_BUCKET },
      } as any);

      const result = await service.createWhiteboard(
        { content },
        mockStorageAggregator,
        actorContext
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.objectContaining({ id: 'doc-auth' }),
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(result.contentPointer).toBe('snap-new');
    });

    it('RED: direct content referencing a document the actor cannot READ aborts in Phase 3 — zero copy, zero persist, rollback', async () => {
      // The exfiltration boundary for UNTRUSTED direct content (no sourceWhiteboardID →
      // per-document READ). Denial here throws AFTER the entity+profile are saved, so
      // this exercises the Phase-3 abort + deleteWhiteboard rollback, distinct from the
      // pre-Phase-1 source-clone rejection.
      const content = await buildAssetSnapshotBase64({ 'file-1': 'loc-1' });
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'loc-1',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-other' },
      } as any);
      // The initiating actor lacks READ on the referenced document.
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new ForbiddenException('denied', 'test' as any);
        }
      );

      await expect(
        service.createWhiteboard(
          { content },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ForbiddenException);
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('RED: a copy failure on the 2nd asset deletes the already-copied 1st and persists nothing', async () => {
      const content = await buildAssetSnapshotBase64({
        'file-1': 'loc-1',
        'file-2': 'loc-2',
      });
      vi.mocked(documentService.getDocumentOrFail).mockImplementation(
        async (id: any) =>
          ({
            id,
            authorization: { id: `${id}-auth` },
            storageBucket: { id: 'sb-other' },
          }) as any
      );
      vi.mocked(storageBucketService.copyDocumentToBucket)
        .mockResolvedValueOnce({ id: 'copy-1' } as any)
        .mockRejectedValueOnce(new Error('copy failed'));

      await expect(
        service.createWhiteboard(
          { content },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow();

      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith('copy-1');
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('copies foreign-content assets into the target bucket with skipDedup=true (never a foreign dedup row)', async () => {
      const content = await buildAssetSnapshotBase64({ 'file-1': 'loc-1' });
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'loc-1',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-other' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copy-1',
      } as any);

      const result = await service.createWhiteboard(
        { content },
        mockStorageAggregator,
        actorContext
      );

      expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
        TARGET_BUCKET,
        expect.objectContaining({ id: 'loc-1' }),
        actorContext.actorID,
        true
      );
      expect(result.contentPointer).toBe('snap-new');
    });

    it('RED: rejects a snapshot whose asset map holds a descriptor object instead of a locator string', async () => {
      const content = buildSnapshotBase64({
        'file-1': { url: 'http://x/y.png' },
      });

      await expect(
        service.createWhiteboard(
          { content },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow();
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
    });

    // --- Desired-snapshot element↔asset preflight (collab-service parity) ---
    it('RED: a live image whose fileId has no asset locator is rejected before any copy or persist', async () => {
      const content = await buildImageSnapshotBase64({ fileId: 'f1' });

      await expect(
        service.createWhiteboard(
          { content },
          mockStorageAggregator,
          actorContext
        )
      ).rejects.toThrow(ValidationException);
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
      expect(fileServiceAdapter.createSnapshotInBucket).not.toHaveBeenCalled();
    });

    it('ignores a missing asset for a DELETED image (preflight examines desired, not prior, elements)', async () => {
      const content = await buildImageSnapshotBase64({
        fileId: 'f1',
        deleted: true,
      });

      const result = await service.createWhiteboard(
        { content },
        mockStorageAggregator,
        actorContext
      );

      expect(result.contentPointer).toBe('snap-new');
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
    });

    it('re-homes an image asset and persists exactly one seeded snapshot when everything resolves', async () => {
      const content = await buildImageSnapshotBase64({
        fileId: 'f1',
        assetLocator: 'loc-1',
      });
      vi.mocked(documentService.getDocumentOrFail).mockResolvedValue({
        id: 'loc-1',
        authorization: { id: 'doc-auth' },
        storageBucket: { id: 'sb-other' },
      } as any);
      vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
        id: 'copy-1',
      } as any);

      const result = await service.createWhiteboard(
        { content },
        mockStorageAggregator,
        actorContext
      );

      expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledTimes(
        1
      );
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledTimes(
        1
      );
      expect(result.contentPointer).toBe('snap-new');
    });
  });
});
