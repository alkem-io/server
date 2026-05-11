/**
 * Integration tests: Collabora document framing upload (spec 095-collabora-import)
 *
 * Exercises the resolver → CalloutFramingService → CollaboraDocumentService
 * pipeline end-to-end with file-service-adapter and storage mocked. The unit
 * tests in `*.spec.ts` files alongside source already cover branch selection
 * and validation in isolation; this file validates the wiring across module
 * boundaries: that a multipart upload arriving at `createCalloutOnCalloutsSet`
 * lands as a `CollaboraDocument` populated from the uploaded bytes via the
 * unified `createCollaboraDocument` service method.
 *
 * Live-DB / live-file-service-go assertions (atomicity audits, latency parity
 * SC-004, the real format-allowlist behaviour, and downstream-event parity for
 * SC-005) are out of scope here — they require the full Docker Compose stack
 * (`pnpm run start:services`). Run those manually via `quickstart.md` before
 * merge or, ideally, in a dedicated CI lane that boots the stack.
 */

import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { COLLABORA_SUPPORTED_MIMES } from '@common/enums/collabora.supported.mime.types';
import { ValidationException } from '@common/exceptions';
import { CollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.entity';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { CreateCollaboraDocumentInput } from '@domain/collaboration/collabora-document/dto/collabora.document.dto.create';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageServiceUnavailableException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';

describe('Collabora framing — upload integration', () => {
  let collaboraDocumentService: CollaboraDocumentService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboraDocumentService,
        repositoryProviderMockFactory(CollaboraDocument),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    collaboraDocumentService = module.get(CollaboraDocumentService);
  });

  describe('createCollaboraDocument — upload mode', () => {
    const docxMime =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const baseInput = (
      override: Partial<CreateCollaboraDocumentInput> = {}
    ): CreateCollaboraDocumentInput => ({
      uploadedFile: {
        buffer: Buffer.from('docx-bytes'),
        filename: 'q3-plan.docx',
        mimetype: docxMime,
      },
      ...override,
    });

    it('stages bytes via file-service-go with the supported-MIME allowlist and temporaryLocation=true', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;
      const fileServiceAdapter = (collaboraDocumentService as any)
        .fileServiceAdapter;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-1',
        mimeType: docxMime,
      } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue(
        undefined as any
      );

      await collaboraDocumentService.createCollaboraDocument(
        baseInput(),
        { id: 'agg-1' } as any,
        'user-1'
      );

      // The decisive call: bytes go to file-service-go with the
      // supported-MIME allowlist (so 415 fires for unsupported uploads)
      // and temporaryLocation=true so the entity-build is rollback-able.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledWith(
        'bucket-1',
        expect.any(Buffer),
        'q3-plan.docx',
        docxMime,
        'user-1',
        true, // temporaryLocation
        true, // skipDedup
        COLLABORA_SUPPORTED_MIMES
      );
      // And the temp file is finalised after the entity is wired.
      expect(fileServiceAdapter.updateDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
    });

    it('derives documentType from the sniffed MIME (input documentType is ignored on upload)', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;
      const fileServiceAdapter = (collaboraDocumentService as any)
        .fileServiceAdapter;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      // file-service-go sniffs and returns spreadsheet MIME, even though
      // the caller hinted DOCX in the input mimetype. The sniff wins.
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-1',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue(
        undefined as any
      );

      const result = await collaboraDocumentService.createCollaboraDocument(
        baseInput({ documentType: CollaboraDocumentType.WORDPROCESSING }),
        { id: 'agg-1' } as any,
        'user-1'
      );

      // Sniff-derived, not the caller-asserted WORDPROCESSING.
      expect(result.documentType).toBe(CollaboraDocumentType.SPREADSHEET);
    });

    it('defaults displayName from the uploaded filename (extension stripped) when input is empty', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;
      const fileServiceAdapter = (collaboraDocumentService as any)
        .fileServiceAdapter;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-1',
        mimeType: docxMime,
      } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue(
        undefined as any
      );

      // FR-012: empty-string displayName must fall through to filename.
      await collaboraDocumentService.createCollaboraDocument(
        baseInput({ displayName: '' }),
        { id: 'agg-1' } as any,
        'user-1'
      );

      expect(profileService.createProfile).toHaveBeenCalledWith(
        { displayName: 'q3-plan' },
        expect.anything(),
        expect.anything()
      );
    });

    it('rolls back the staged file when profile creation fails', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;
      const fileServiceAdapter = (collaboraDocumentService as any)
        .fileServiceAdapter;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-1',
        mimeType: docxMime,
      } as any);
      vi.mocked(profileService.createProfile).mockRejectedValue(
        new Error('profile bucket exhausted')
      );
      vi.mocked(fileServiceAdapter.deleteDocument).mockResolvedValue(
        undefined as any
      );

      await expect(
        collaboraDocumentService.createCollaboraDocument(
          baseInput(),
          { id: 'agg-1' } as any,
          'user-1'
        )
      ).rejects.toThrow('profile bucket exhausted');

      // The decisive atomicity check: staged file must be deleted.
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith('doc-1');
    });

    it('rolls back the staged file AND the profile when finalize fails', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;
      const fileServiceAdapter = (collaboraDocumentService as any)
        .fileServiceAdapter;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-1',
        mimeType: docxMime,
      } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(profileService.deleteProfile).mockResolvedValue(
        undefined as any
      );
      vi.mocked(fileServiceAdapter.updateDocument).mockRejectedValue(
        new Error('finalize 500')
      );
      vi.mocked(fileServiceAdapter.deleteDocument).mockResolvedValue(
        undefined as any
      );

      await expect(
        collaboraDocumentService.createCollaboraDocument(
          baseInput(),
          { id: 'agg-1' } as any,
          'user-1'
        )
      ).rejects.toThrow('finalize 500');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith('doc-1');
    });

    it('propagates StorageServiceUnavailableException without retry (fail-fast per clarify Q6)', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockRejectedValue(
        new StorageServiceUnavailableException('file-service-go down', {})
      );

      await expect(
        collaboraDocumentService.createCollaboraDocument(
          baseInput(),
          { id: 'agg-1' } as any,
          'user-1'
        )
      ).rejects.toThrow(StorageServiceUnavailableException);

      // No retry — exactly one upstream call.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('createCollaboraDocument — blank mode (FR-001 non-regression)', () => {
    it('rejects with ValidationException when displayName or documentType is missing on the blank path', async () => {
      // Empty input — no uploadedFile, no displayName, no documentType.
      await expect(
        collaboraDocumentService.createCollaboraDocument(
          {} as any,
          { id: 'agg-1' } as any
        )
      ).rejects.toThrow(ValidationException);
    });

    it('does not pass an allowedMimeTypes override on the blank path (bucket-default validation applies)', async () => {
      const storageBucketService = (collaboraDocumentService as any)
        .storageBucketService;
      const storageAggregatorService = (collaboraDocumentService as any)
        .storageAggregatorService;
      const profileService = (collaboraDocumentService as any).profileService;

      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({
        id: 'bucket-1',
      } as any);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'doc-blank',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-blank',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        undefined as any
      );

      await collaboraDocumentService.createCollaboraDocument(
        {
          displayName: 'Q3',
          documentType: CollaboraDocumentType.WORDPROCESSING,
        },
        { id: 'agg-1' } as any,
        'user-1'
      );

      // 8th positional arg (allowedMimeTypes) must be undefined on blank,
      // and temporaryLocation (6th) must be false — single-phase write.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledWith(
        'bucket-1',
        expect.any(Buffer),
        'Q3.docx',
        expect.any(String),
        'user-1',
        false, // temporaryLocation
        true, // skipDedup
        undefined // allowedMimeTypes — defer to bucket
      );
    });
  });
});
