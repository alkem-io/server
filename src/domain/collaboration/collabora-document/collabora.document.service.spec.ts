import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { ValidationException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WopiServiceAdapter } from '@services/adapters/wopi-service-adapter/wopi.service.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { CollaboraDocument } from './collabora.document.entity';
import { CollaboraDocumentService } from './collabora.document.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('CollaboraDocumentService', () => {
  let service: CollaboraDocumentService;
  let repository: { findOne: Mock; save: Mock; remove: Mock };
  let wopiServiceAdapter: WopiServiceAdapter;
  let storageBucketService: StorageBucketService;
  let fileServiceAdapter: FileServiceAdapter;
  let documentService: DocumentService;
  let profileService: ProfileService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboraDocumentService,
        {
          provide: getRepositoryToken(CollaboraDocument),
          useValue: {
            findOne: vi.fn(),
            save: vi.fn(),
            remove: vi.fn(),
          },
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaboraDocumentService);
    repository = module.get(getRepositoryToken(CollaboraDocument));
    wopiServiceAdapter = module.get(WopiServiceAdapter);
    storageBucketService = module.get(StorageBucketService);
    fileServiceAdapter = module.get(FileServiceAdapter);
    documentService = module.get(DocumentService);
    profileService = module.get(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('replaceCollaboraDocument', () => {
    const existingDoc = () =>
      ({
        id: 'collab-doc-1',
        documentType: CollaboraDocumentType.SPREADSHEET,
        originalMimeType: XLSX_MIME,
        document: {
          id: 'old-doc',
          storageBucket: { id: 'bucket-1' },
        },
        profile: { id: 'profile-1', displayName: 'Quarterly Report' },
      }) as any;

    it('swaps the backing file in place: keeps id/displayName/documentType, re-points document, deletes the old file', async () => {
      // First load (document + storageBucket relations), then the final reload
      // (profile relation) returning the identity-preserving result.
      repository.findOne
        .mockResolvedValueOnce(existingDoc())
        .mockResolvedValueOnce({
          id: 'collab-doc-1',
          documentType: CollaboraDocumentType.SPREADSHEET,
          profile: { id: 'profile-1', displayName: 'Quarterly Report' },
          document: { id: 'new-doc' },
        } as any);

      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(false);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: XLSX_MIME } as any);
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
      repository.save.mockImplementation(async (d: any) => d);
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);

      const result = await service.replaceCollaboraDocument(
        'collab-doc-1',
        Buffer.from('new-bytes'),
        'report.xlsx',
        XLSX_MIME,
        'user-1'
      );

      // Staged into the SAME bucket, temp + skipDedup + allowlist.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledWith(
        'bucket-1',
        expect.any(Buffer),
        'report.xlsx',
        XLSX_MIME,
        'user-1',
        true,
        true,
        expect.arrayContaining([XLSX_MIME])
      );

      // Finalized out of temp.
      expect(fileServiceAdapter.updateDocument).toHaveBeenCalledWith(
        'new-doc',
        {
          temporaryLocation: false,
        }
      );

      // FK re-pointed to the new document; documentType unchanged.
      const saved = repository.save.mock.calls[0][0];
      expect(saved.document.id).toBe('new-doc');
      expect(saved.documentType).toBe(CollaboraDocumentType.SPREADSHEET);
      expect(saved.originalMimeType).toBe(XLSX_MIME);

      // Old backing file released AFTER finalize.
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'old-doc',
      });

      // Identity preserved; display name untouched.
      expect(result.id).toBe('collab-doc-1');
      expect(result.documentType).toBe(CollaboraDocumentType.SPREADSHEET);
      expect(result.profile?.displayName).toBe('Quarterly Report');

      // Rename NOT persisted here (FR-009/FR-015).
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });

    it('refuses a locked (being-edited) document and makes no change', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(true);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow(ValidationException);

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('refuses when the lock signal is unavailable (adapter fail-closed → true)', async () => {
      // The adapter returns true on any error (fail-closed); the service must
      // treat that as locked and refuse without staging anything.
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(true);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow(
        'This document is currently being edited. Please try again once no one is editing.'
      );

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
    });

    it('rejects a different-type replacement and compensates the staged file, leaving the original intact', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(false);
      // Sniffed as a Word doc, but the existing document is a spreadsheet.
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: DOCX_MIME } as any);
      vi.mocked(fileServiceAdapter.deleteDocument).mockResolvedValue({} as any);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.docx',
          DOCX_MIME
        )
      ).rejects.toThrow(ValidationException);

      // Staged temp file cleaned up; original never re-pointed or deleted.
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith('new-doc');
      expect(fileServiceAdapter.updateDocument).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('propagates an unsupported-format rejection from staging and makes no change', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(false);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockRejectedValue(new Error('415 ErrUnsupportedMediaType'));

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.txt',
          'text/plain'
        )
      ).rejects.toThrow('415');

      // Nothing was staged successfully → no compensation delete, no re-point.
      expect(fileServiceAdapter.updateDocument).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('propagates an oversized-file rejection from staging and makes no change', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(false);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockRejectedValue(new Error('file exceeds maximum size'));

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'huge.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow('maximum size');

      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('keeps the swap successful when releasing the old file fails (best-effort, FR-010)', async () => {
      repository.findOne
        .mockResolvedValueOnce(existingDoc())
        .mockResolvedValueOnce({
          id: 'collab-doc-1',
          documentType: CollaboraDocumentType.SPREADSHEET,
          profile: { id: 'profile-1', displayName: 'Quarterly Report' },
        } as any);
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(false);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: XLSX_MIME } as any);
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
      repository.save.mockImplementation(async (d: any) => d);
      vi.mocked(documentService.deleteDocument).mockRejectedValue(
        new Error('old file gone')
      );

      const result = await service.replaceCollaboraDocument(
        'collab-doc-1',
        Buffer.from('x'),
        'report.xlsx',
        XLSX_MIME
      );

      expect(result.id).toBe('collab-doc-1');
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
