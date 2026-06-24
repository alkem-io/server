import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { WhiteboardPreviewMode } from '@common/enums/whiteboard.preview.mode';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ILicense } from '@domain/common/license/license.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
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
import { IWhiteboard } from './whiteboard.interface';
import { WhiteboardService } from './whiteboard.service';

/**
 * Build a base64-encoded Yjs-V2 whiteboard snapshot (the single content
 * representation since 006-collab-content-unification — never Excalidraw JSON).
 * Mirrors the wire schema `rehomeSnapshotMedia` operates on: a `files` Y.Map
 * keyed by file id. Pass `files` to exercise the embedded-media re-home path.
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

describe('WhiteboardService', () => {
  let service: WhiteboardService;
  let whiteboardRepository: MockType<Repository<Whiteboard>>;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let communityResolverService: CommunityResolverService;
  let licenseService: LicenseService;
  let profileDocumentsService: ProfileDocumentsService;
  let fileServiceAdapter: FileServiceAdapter;

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    communityResolverService = module.get(CommunityResolverService);
    licenseService = module.get(LicenseService);
    profileDocumentsService = module.get(ProfileDocumentsService);
    fileServiceAdapter = module.get(FileServiceAdapter);
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
        mockStorageAggregator
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

    it('should set createdBy when userID is provided', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator,
        'user-42'
      );

      expect(result.createdBy).toBe('user-42');
    });

    it('should leave createdBy undefined when userID is not provided', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator
      );

      expect(result.createdBy).toBeUndefined();
    });

    it('should use default preview coordinates as null when not provided', async () => {
      const result = await service.createWhiteboard(
        { content: validEmptyContent },
        mockStorageAggregator
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
        mockStorageAggregator
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
        mockStorageAggregator
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
      whiteboardRepository.remove!.mockResolvedValue({} as Whiteboard);
      vi.mocked(profileService.deleteProfile).mockResolvedValue(
        whiteboard.profile as any
      );
      vi.mocked(authorizationPolicyService.delete).mockResolvedValue({} as any);

      const result = await service.deleteWhiteboard('wb-1');

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'profile-1'
      );
      expect(vi.mocked(authorizationPolicyService.delete)).toHaveBeenCalledWith(
        whiteboard.authorization
      );
      expect(whiteboardRepository.remove).toHaveBeenCalledWith(whiteboard);
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
    it('should encode a snapshot, reupload documents, and save', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);

      // Mock getProfileOrFail on profileService
      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-1',
        storageBucket: { id: 'sb-1', documents: [] },
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-1',
        externalID: 'ext-1',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });

      const newContent = buildSnapshotBase64();

      const result = await service.updateWhiteboardContent('wb-1', newContent);

      // The snapshot is re-homed and written verbatim to the bucket; the returned
      // id becomes the contentPointer (the inline column is gone).
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sb-1'
      );
      expect(result.contentPointer).toBe('snap-1');
      expect(result.blobStore).toBe(BlobStoreKind.FILE_SERVICE);
      expect(whiteboardRepository.save).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when profile not initialized', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: undefined,
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      await expect(
        service.updateWhiteboardContent('wb-1', '{"elements":[]}')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should still write a snapshot when no files in whiteboard content', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);

      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-1',
        storageBucket: { id: 'sb-1', documents: [] },
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-1',
        externalID: 'ext-1',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });

      const newContent = buildSnapshotBase64();
      const result = await service.updateWhiteboardContent('wb-1', newContent);

      expect(result.contentPointer).toBe('snap-1');
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalled();
    });

    it('should handle file reupload errors gracefully', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);

      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-1',
        storageBucket: { id: 'sb-1', documents: [] },
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-1',
        externalID: 'ext-1',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });

      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockRejectedValue(
        new EntityNotFoundException('File not found', 'test' as any)
      );

      const contentWithFiles = buildSnapshotBase64({
        'file-1': { id: 'file-1', url: 'http://old.url/file.png' },
      });

      const result = await service.updateWhiteboardContent(
        'wb-1',
        contentWithFiles
      );

      // Should not throw, should handle gracefully and still persist a snapshot
      expect(result.contentPointer).toBe('snap-1');
    });

    it('should reupload referenced files before encoding the snapshot', async () => {
      const whiteboard = {
        id: 'wb-1',
        profile: { id: 'profile-1', storageBucket: { id: 'sb-1' } },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);
      whiteboardRepository.save!.mockImplementation(async (wb: any) => wb);

      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-1',
        storageBucket: { id: 'sb-1', documents: [] },
      } as any);
      vi.mocked(fileServiceAdapter.createSnapshotInBucket).mockResolvedValue({
        id: 'snap-1',
        externalID: 'ext-1',
        mimeType: 'application/octet-stream',
        size: 1,
        reused: false,
      });

      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockResolvedValue('http://new.url/file.png');

      const contentWithFiles = buildSnapshotBase64({
        'file-1': { id: 'file-1', url: 'http://old.url/file.png' },
      });

      const result = await service.updateWhiteboardContent(
        'wb-1',
        contentWithFiles
      );

      // The embedded media is re-homed into the WB's bucket, then the scene is
      // encoded to a Yjs-V2 snapshot and stored (content is no longer inline).
      expect(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).toHaveBeenCalledWith(
        'http://old.url/file.png',
        expect.objectContaining({ id: 'sb-1' }),
        true
      );
      expect(fileServiceAdapter.createSnapshotInBucket).toHaveBeenCalledWith(
        expect.any(Buffer),
        'sb-1'
      );
      expect(result.contentPointer).toBe('snap-1');
    });

    it('should throw EntityNotInitializedException when storageBucket not found', async () => {
      const whiteboard = {
        id: 'wb-1',
        content: '{}',
        profile: { id: 'profile-1' },
      } as unknown as Whiteboard;
      whiteboardRepository.findOne!.mockResolvedValue(whiteboard);

      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-1',
        storageBucket: undefined,
      } as any);

      const contentWithFiles = buildSnapshotBase64({
        'file-1': { id: 'file-1', url: 'http://old.url/file.png' },
      });

      await expect(
        service.updateWhiteboardContent('wb-1', contentWithFiles)
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

  describe('createWhiteboard — server-side copy from sourceWhiteboardID (#29)', () => {
    const mockStorageAggregator = {} as IStorageAggregator;
    const mockProfile = {
      id: 'profile-new',
      displayName: 'Whiteboard Template',
      storageBucket: { id: 'sb-new' },
    } as unknown as IProfile;

    // A real, openable empty Yjs-V2 snapshot (no embedded media → rehome is a
    // verbatim pass-through, so no profile-document mocks are needed). Stands in
    // for the SOURCE whiteboard's content ("content X").
    const sourceSnapshotBase64 = Buffer.from(
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
    });

    it("copies the source whiteboard's content (X) into the new whiteboard, overriding the empty client placeholder", async () => {
      // The SOURCE whiteboard the template is captured from — its content lives in
      // its own bucket and is read via getWhiteboardContent → file-service batch.
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'source-wb',
        contentPointer: 'source-ptr',
      } as unknown as Whiteboard);
      vi.mocked(fileServiceAdapter.getContentBatch).mockResolvedValue([
        { id: 'source-ptr', found: true, contentBase64: sourceSnapshotBase64 },
      ]);

      const result = await service.createWhiteboard(
        {
          // The client now sends an EMPTY placeholder here for the
          // Save-as-Template flow; the source copy must win.
          content: Buffer.from('EMPTY-PLACEHOLDER').toString('base64'),
          sourceWhiteboardID: 'source-wb',
          profile: { displayName: 'Whiteboard Template' },
        },
        mockStorageAggregator
      );

      // The new whiteboard's bucket is seeded from the SOURCE snapshot bytes, NOT
      // the empty placeholder — the snapshot written is byte-equal to the source's
      // (an empty Y.Doc has no embedded media, so rehome is a verbatim pass).
      expect(fileServiceAdapter.getContentBatch).toHaveBeenCalledWith([
        'source-ptr',
      ]);
      const [writtenSnapshot, bucketId] = vi.mocked(
        fileServiceAdapter.createSnapshotInBucket
      ).mock.calls[0];
      expect(bucketId).toBe('sb-new');
      expect(Buffer.from(writtenSnapshot).toString('base64')).toBe(
        sourceSnapshotBase64
      );
      expect(result.contentPointer).toBe('snap-new');
      expect(result.blobStore).toBe(BlobStoreKind.FILE_SERVICE);
    });

    it('falls back to the client `content` when the source whiteboard has no stored content (never edited)', async () => {
      whiteboardRepository.findOne!.mockResolvedValue({
        id: 'source-wb',
        contentPointer: undefined,
      } as unknown as Whiteboard);
      vi.mocked(profileService.getProfileOrFail).mockResolvedValue({
        id: 'profile-new',
        storageBucket: { id: 'sb-new', documents: [] },
      } as any);

      const fallbackContent = Buffer.from(
        Y.encodeStateAsUpdateV2(new Y.Doc())
      ).toString('base64');

      const result = await service.createWhiteboard(
        {
          content: fallbackContent,
          sourceWhiteboardID: 'source-wb',
          profile: { displayName: 'Whiteboard Template' },
        },
        mockStorageAggregator
      );

      // Source returned "" → the create content is used instead.
      const [writtenSnapshot] = vi.mocked(
        fileServiceAdapter.createSnapshotInBucket
      ).mock.calls[0];
      expect(Buffer.from(writtenSnapshot).toString('base64')).toBe(
        fallbackContent
      );
      expect(result.contentPointer).toBe('snap-new');
    });

    it('does not read a source when sourceWhiteboardID is absent', async () => {
      const result = await service.createWhiteboard(
        {
          content: sourceSnapshotBase64,
          profile: { displayName: 'Whiteboard Template' },
        },
        mockStorageAggregator
      );

      expect(fileServiceAdapter.getContentBatch).not.toHaveBeenCalled();
      expect(result.contentPointer).toBe('snap-new');
    });
  });
});
