import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import {
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
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
const PDF_MIME = 'application/pdf';
const ZIP_MIME = 'application/zip';

describe('CollaboraDocumentService', () => {
  let service: CollaboraDocumentService;
  let repository: { findOne: Mock; save: Mock; remove: Mock };
  let wopiServiceAdapter: WopiServiceAdapter;
  let storageBucketService: StorageBucketService;
  let storageAggregatorService: StorageAggregatorService;
  let fileServiceAdapter: FileServiceAdapter;
  let documentService: DocumentService;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let authorizationService: AuthorizationService;

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
    storageAggregatorService = module.get(StorageAggregatorService);
    fileServiceAdapter = module.get(FileServiceAdapter);
    documentService = module.get(DocumentService);
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    authorizationService = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCollaboraDocument', () => {
    const storageAggregator = { id: 'aggregator-1' } as any;
    const actorContext = { actorID: 'user-1' } as any;

    beforeEach(() => {
      vi.mocked(
        storageAggregatorService.getDirectStorageBucket
      ).mockResolvedValue({ id: 'bucket-1' } as any);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
        displayName: 'report',
      } as any);
      vi.mocked(profileService.addOrUpdateTagsetOnProfile).mockResolvedValue(
        {} as any
      );
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
    });

    it('accepts an uploaded PDF and types the resulting document as PDF', async () => {
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'doc-1', mimeType: PDF_MIME } as any);

      const result = await service.createCollaboraDocument(
        {
          uploadedFile: {
            buffer: Buffer.from('%PDF-1.4'),
            filename: 'report.pdf',
            mimetype: PDF_MIME,
          },
        } as any,
        storageAggregator,
        actorContext,
        'user-1'
      );

      expect(result.documentType).toBe(CollaboraDocumentType.PDF);
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledWith(
        'bucket-1',
        expect.any(Buffer),
        'report.pdf',
        PDF_MIME,
        'user-1',
        true,
        true,
        expect.arrayContaining([PDF_MIME])
      );
      expect(fileServiceAdapter.updateDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
    });

    it('continues to reject a file type outside the allowlist, e.g. .zip (regression)', async () => {
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockRejectedValue(new Error('415 ErrUnsupportedMediaType'));

      await expect(
        service.createCollaboraDocument(
          {
            uploadedFile: {
              buffer: Buffer.from('PK'),
              filename: 'archive.zip',
              mimetype: ZIP_MIME,
            },
          } as any,
          storageAggregator,
          actorContext,
          'user-1'
        )
      ).rejects.toThrow('415');
    });

    it('rejects a blank-create request for PDF: no blank-create option exists for it', async () => {
      await expect(
        service.createCollaboraDocument(
          {
            displayName: 'Untitled',
            documentType: CollaboraDocumentType.PDF,
          } as any,
          storageAggregator,
          actorContext,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);

      // Never reached staging — rejected before any bytes are written.
      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
    });

    it('still rejects a blank create with neither file nor source when displayName or documentType is missing', async () => {
      await expect(
        service.createCollaboraDocument(
          { documentType: CollaboraDocumentType.WORDPROCESSING } as any,
          storageAggregator,
          actorContext,
          'user-1'
        )
      ).rejects.toThrow(
        'createCollaboraDocument requires displayName and documentType when no file is supplied.'
      );

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(storageBucketService.copyDocumentToBucket).not.toHaveBeenCalled();
    });

    describe('source mode (copy-on-apply)', () => {
      const SOURCE_ID = '3f2b7c1e-5a4d-4e6b-9c8a-1d2e3f4a5b6c';
      const sourceDocument = { id: 'source-doc-1', mimeType: DOCX_MIME };
      const source = {
        id: SOURCE_ID,
        documentType: CollaboraDocumentType.WORDPROCESSING,
        originalMimeType: DOCX_MIME,
        authorization: { id: 'source-auth' },
        document: sourceDocument,
        profile: { id: 'source-profile', displayName: 'Template body' },
      };

      beforeEach(() => {
        repository.findOne.mockResolvedValue(source);
        vi.mocked(storageBucketService.copyDocumentToBucket).mockResolvedValue({
          id: 'copy-doc-1',
          mimeType: DOCX_MIME,
        } as any);
      });

      it('copies the source document into the destination bucket with skipDedup, never staging bytes', async () => {
        await service.createCollaboraDocument(
          { sourceCollaboraDocumentID: SOURCE_ID } as any,
          storageAggregator,
          actorContext,
          'user-1'
        );

        expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
          'bucket-1',
          sourceDocument,
          'user-1',
          true
        );
        expect(
          storageBucketService.uploadFileAsDocumentFromBuffer
        ).not.toHaveBeenCalled();
      });

      it('attributes the copy to the caller when no userID is threaded (template path), never to the source document creator', async () => {
        repository.findOne.mockResolvedValue({
          ...source,
          document: { ...sourceDocument, createdBy: 'other-user' },
        });

        await service.createCollaboraDocument(
          { sourceCollaboraDocumentID: SOURCE_ID } as any,
          storageAggregator,
          actorContext
        );

        expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
          'bucket-1',
          expect.anything(),
          'user-1',
          true
        );
      });

      it('never consults the blank-create MIME map when the input carries no documentType', async () => {
        const getDefaultMimeForCreate = vi.spyOn(
          service as any,
          'getDefaultMimeForCreate'
        );

        await service.createCollaboraDocument(
          { sourceCollaboraDocumentID: SOURCE_ID } as any,
          storageAggregator,
          actorContext,
          'user-1'
        );

        expect(getDefaultMimeForCreate).not.toHaveBeenCalled();
      });

      it('authorizes READ on the source before any byte is copied', async () => {
        await service.createCollaboraDocument(
          { sourceCollaboraDocumentID: SOURCE_ID } as any,
          storageAggregator,
          actorContext,
          'user-1'
        );

        expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
          actorContext,
          source.authorization,
          AuthorizationPrivilege.READ,
          expect.stringContaining(SOURCE_ID)
        );
        expect(
          vi.mocked(authorizationService.grantAccessOrFail).mock
            .invocationCallOrder[0]
        ).toBeLessThan(
          vi.mocked(storageBucketService.copyDocumentToBucket).mock
            .invocationCallOrder[0]
        );
      });

      it('copies nothing when READ on the source is denied', async () => {
        vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
          () => {
            throw new ForbiddenException('denied', LogContext.COLLABORATION);
          }
        );

        await expect(
          service.createCollaboraDocument(
            { sourceCollaboraDocumentID: SOURCE_ID } as any,
            storageAggregator,
            actorContext,
            'user-1'
          )
        ).rejects.toThrow(ForbiddenException);

        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
      });

      it('inherits documentType, originalMimeType and displayName from the source, ignoring any supplied in the input', async () => {
        const result = await service.createCollaboraDocument(
          {
            sourceCollaboraDocumentID: SOURCE_ID,
            displayName: 'Ignored title',
            documentType: CollaboraDocumentType.SPREADSHEET,
          } as any,
          storageAggregator,
          actorContext,
          'user-1'
        );

        expect(result.documentType).toBe(CollaboraDocumentType.WORDPROCESSING);
        expect(result.originalMimeType).toBe(DOCX_MIME);
        expect(profileService.createProfile).toHaveBeenCalledWith(
          { displayName: 'Template body' },
          expect.anything(),
          storageAggregator
        );
      });

      it('rejects a create that supplies both an uploaded file and a source, before touching any adapter', async () => {
        await expect(
          service.createCollaboraDocument(
            {
              sourceCollaboraDocumentID: SOURCE_ID,
              uploadedFile: {
                buffer: Buffer.from('docx'),
                filename: 'q3.docx',
                mimetype: DOCX_MIME,
              },
            } as any,
            storageAggregator,
            actorContext,
            'user-1'
          )
        ).rejects.toThrow(ValidationException);

        expect(
          storageAggregatorService.getDirectStorageBucket
        ).not.toHaveBeenCalled();
        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
        expect(
          storageBucketService.uploadFileAsDocumentFromBuffer
        ).not.toHaveBeenCalled();
      });

      it('rolls back only the copied row when a later step fails, leaving the source file alone', async () => {
        vi.mocked(profileService.createProfile).mockRejectedValue(
          new Error('profile create failed')
        );

        await expect(
          service.createCollaboraDocument(
            { sourceCollaboraDocumentID: SOURCE_ID } as any,
            storageAggregator,
            actorContext,
            'user-1'
          )
        ).rejects.toThrow('profile create failed');

        expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
          'copy-doc-1'
        );
        expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalledWith(
          'source-doc-1'
        );
      });
    });
  });

  describe('getEditorUrl', () => {
    it('issues a WOPI token from the supplied backing document without reloading', async () => {
      const collaboraDocument = {
        id: 'collabora-document-1',
        document: { id: 'storage-document-1' },
      } as any;
      vi.mocked(wopiServiceAdapter.issueToken).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      } as any);

      const result = await service.getEditorUrl(
        collaboraDocument,
        'actor-1',
        'Actor One',
        'nl'
      );

      expect(repository.findOne).not.toHaveBeenCalled();
      expect(wopiServiceAdapter.issueToken).toHaveBeenCalledWith(
        'storage-document-1',
        'actor-1',
        'Actor One',
        'nl'
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
    });

    it('preserves the static missing-backing-document exception contract', async () => {
      const collaboraDocument = {
        id: 'collabora-document-without-backing',
      } as any;

      const error = await service
        .getEditorUrl(collaboraDocument, 'actor-1', undefined, 'en')
        .catch(reason => reason);

      expect(error).toBeInstanceOf(RelationshipNotFoundException);
      expect(error.message).toBe('Document not found on CollaboraDocument');
      expect(error.details).toEqual({
        collaboraDocumentId: 'collabora-document-without-backing',
      });
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(wopiServiceAdapter.issueToken).not.toHaveBeenCalled();
    });
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

      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
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
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('locked');

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
      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('refuses when the lock check is unavailable (fails closed with a distinct message) and makes no change', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue(
        'unavailable'
      );

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow(
        'The document could not be checked for active edits. Please try again in a moment.'
      );

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('rejects a different-type replacement and compensates the staged file, leaving the original intact', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
      // Sniffed as a Word doc, but the existing document is a spreadsheet.
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: DOCX_MIME } as any);
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.docx',
          DOCX_MIME
        )
      ).rejects.toThrow(ValidationException);

      // Staged file fully cleaned up (file + auth policy + tagset, via
      // documentService.deleteDocument — not the file-only adapter); original
      // never re-pointed and the OLD file is never touched.
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'new-doc',
      });
      expect(documentService.deleteDocument).not.toHaveBeenCalledWith({
        ID: 'old-doc',
      });
      expect(fileServiceAdapter.updateDocument).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('replaces a PDF document with another PDF', async () => {
      const existingPdfDoc = () =>
        ({
          ...existingDoc(),
          documentType: CollaboraDocumentType.PDF,
          originalMimeType: PDF_MIME,
        }) as any;

      repository.findOne
        .mockResolvedValueOnce(existingPdfDoc())
        .mockResolvedValueOnce({
          id: 'collab-doc-1',
          documentType: CollaboraDocumentType.PDF,
          profile: { id: 'profile-1', displayName: 'Quarterly Report' },
          document: { id: 'new-doc' },
        } as any);

      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: PDF_MIME } as any);
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
      repository.save.mockImplementation(async (d: any) => d);
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);

      const result = await service.replaceCollaboraDocument(
        'collab-doc-1',
        Buffer.from('new-pdf-bytes'),
        'report-v2.pdf',
        PDF_MIME,
        'user-1'
      );

      const saved = repository.save.mock.calls[0][0];
      expect(saved.document.id).toBe('new-doc');
      expect(saved.documentType).toBe(CollaboraDocumentType.PDF);
      expect(saved.originalMimeType).toBe(PDF_MIME);
      expect(result.documentType).toBe(CollaboraDocumentType.PDF);
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'old-doc',
      });
    });

    it('rejects replacing a PDF document with a non-PDF file (same-type enforcement)', async () => {
      const existingPdfDoc = () =>
        ({
          ...existingDoc(),
          documentType: CollaboraDocumentType.PDF,
          originalMimeType: PDF_MIME,
        }) as any;

      repository.findOne.mockResolvedValueOnce(existingPdfDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
      // Sniffed as a spreadsheet, but the existing document is a PDF.
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({ id: 'new-doc', mimeType: XLSX_MIME } as any);
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow(ValidationException);

      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'new-doc',
      });
      expect(documentService.deleteDocument).not.toHaveBeenCalledWith({
        ID: 'old-doc',
      });
      expect(fileServiceAdapter.updateDocument).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    // Cascade helpers pass the document policy through unchanged, so the value
    // saved/returned is the new backing document's own policy object.
    const wireCascade = () => {
      vi.mocked(
        authorizationPolicyService.inheritParentAuthorization
      ).mockImplementation((docAuth: any) => docAuth);
      vi.mocked(
        authorizationPolicyService.appendPrivilegeAuthorizationRules
      ).mockImplementation((docAuth: any) => docAuth);
      vi.mocked(authorizationPolicyService.getPrivilegeRules).mockReturnValue(
        [] as any
      );
    };

    it('re-cascades the CollaboraDocument authorization onto the new backing document and persists it BEFORE the FK save', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          ...existingDoc(),
          authorization: { id: 'collab-auth' },
        })
        .mockResolvedValueOnce({
          id: 'collab-doc-1',
          document: { id: 'new-doc' },
          profile: { displayName: 'Quarterly Report' },
        } as any);
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'new-doc',
        mimeType: XLSX_MIME,
        authorization: { id: 'new-doc-auth' },
      } as any);
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);
      repository.save.mockImplementation(async (d: any) => d);
      wireCascade();

      await service.replaceCollaboraDocument(
        'collab-doc-1',
        Buffer.from('x'),
        'report.xlsx',
        XLSX_MIME,
        'user-1'
      );

      // The new backing document's policy is persisted...
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
        { id: 'new-doc-auth' },
      ]);
      // ...and BEFORE the FK re-point is saved, so an authz failure rolls back.
      const saveAllOrder = (authorizationPolicyService.saveAll as Mock).mock
        .invocationCallOrder[0];
      const repoSaveOrder = repository.save.mock.invocationCallOrder[0];
      expect(saveAllOrder).toBeLessThan(repoSaveOrder);
    });

    it('compensates the staged file and leaves the original intact when persisting the new authorization fails', async () => {
      repository.findOne.mockResolvedValueOnce({
        ...existingDoc(),
        authorization: { id: 'collab-auth' },
      });
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue({
        id: 'new-doc',
        mimeType: XLSX_MIME,
        authorization: { id: 'new-doc-auth' },
      } as any);
      vi.mocked(fileServiceAdapter.updateDocument).mockResolvedValue({} as any);
      wireCascade();
      vi.mocked(authorizationPolicyService.saveAll).mockRejectedValue(
        new Error('db down')
      );
      vi.mocked(documentService.deleteDocument).mockResolvedValue({} as any);

      await expect(
        service.replaceCollaboraDocument(
          'collab-doc-1',
          Buffer.from('x'),
          'report.xlsx',
          XLSX_MIME
        )
      ).rejects.toThrow('db down');

      // New staged file fully rolled back; FK never saved; OLD file untouched.
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'new-doc',
      });
      expect(documentService.deleteDocument).not.toHaveBeenCalledWith({
        ID: 'old-doc',
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('propagates an unsupported-format rejection from staging and makes no change', async () => {
      repository.findOne.mockResolvedValueOnce(existingDoc());
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
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
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
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
      vi.mocked(wopiServiceAdapter.getLockStatus).mockResolvedValue('unlocked');
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

  describe('getPreviewUrl', () => {
    it('returns the same-origin preview URL built from the backing file stable fileID', async () => {
      repository.findOne.mockResolvedValue({
        id: 'collab-doc-1',
        document: { id: 'file-1' },
      } as any);

      const result = await service.getPreviewUrl('collab-doc-1');

      expect(result).toBe('/api/private/wopi/files/file-1/preview');
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'collab-doc-1' },
          relations: { document: true },
        })
      );
    });

    it('returns null when the CollaboraDocument has no backing file relation', async () => {
      repository.findOne.mockResolvedValue({
        id: 'collab-doc-1',
        document: undefined,
      } as any);

      const result = await service.getPreviewUrl('collab-doc-1');

      expect(result).toBeNull();
    });

    it('URL-encodes a fileID so the resulting path stays a single stable segment', async () => {
      repository.findOne.mockResolvedValue({
        id: 'collab-doc-1',
        document: { id: 'file/needs encoding' },
      } as any);

      const result = await service.getPreviewUrl('collab-doc-1');

      expect(result).toBe(
        '/api/private/wopi/files/file%2Fneeds%20encoding/preview'
      );
    });
  });
});
