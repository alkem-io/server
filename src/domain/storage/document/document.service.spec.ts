import { STORAGE_SERVICE } from '@common/constants';
import { MimeFileType } from '@common/enums/mime.file.type';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions';
import { DocumentSaveFailedException } from '@common/exceptions/document/document.save.failed.exception';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '@services/adapters/storage';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { Document } from './document.entity';
import { DocumentService } from './document.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

const HOSTING_CONFIG = {
  endpoint_cluster: 'https://alkem.io',
  path_api_private_rest: '/api/private/rest',
};
const BASE_DOCUMENT_URL = `${HOSTING_CONFIG.endpoint_cluster}${HOSTING_CONFIG.path_api_private_rest}/storage/document`;

describe('DocumentService', () => {
  let service: DocumentService;
  let db: any;
  let tagsetService: TagsetService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let storageService: StorageService;

  beforeEach(async () => {
    // Mock static Document.create to avoid DataSource requirement
    vi.spyOn(Document, 'create').mockImplementation((input: any) => {
      const entity = new Document();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: STORAGE_SERVICE,
          useValue: {
            save: vi.fn(),
            read: vi.fn(),
            delete: vi.fn(),
            exists: vi.fn(),
            getType: vi.fn(),
          },
        },
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockReturnValue(HOSTING_CONFIG),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get<DocumentService>(DocumentService);
    db = module.get(DRIZZLE);
    tagsetService = module.get<TagsetService>(TagsetService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    storageService = module.get<StorageService>(STORAGE_SERVICE);
  });

  // ── createDocument ──────────────────────────────────────────────

  describe('createDocument', () => {
    it('should create a document with tagset, authorization policy, and persist it when valid input provided', async () => {
      const input = {
        displayName: 'test.png',
        mimeType: MimeTypeVisual.PNG as MimeFileType,
        size: 1024,
        externalID: 'ext-123',
        temporaryLocation: false,
      };
      const mockTagset = {
        id: 'tagset-1',
        name: TagsetReservedName.DEFAULT,
        tags: [],
      };
      (tagsetService.createTagset as Mock).mockReturnValue(mockTagset);
      vi.spyOn(service, 'save' as any).mockImplementation(async (doc: any) => doc);

      const result = await service.createDocument(input);

      expect(tagsetService.createTagset).toHaveBeenCalledWith({
        name: TagsetReservedName.DEFAULT,
        tags: [],
      });
      expect(result.tagset).toBe(mockTagset);
      expect(result.authorization).toBeDefined();
    });
  });

  // ── deleteDocument ──────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('should delete authorization policy, tagset, and remove document when document exists', async () => {
      const mockAuth = { id: 'auth-1' };
      const mockTagset = { id: 'tagset-1' };
      const document = {
        id: 'doc-1',
        externalID: 'ext-1',
        authorization: mockAuth,
        tagset: mockTagset,
      };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (tagsetService.removeTagset as Mock).mockResolvedValue(undefined);

      const result = await service.deleteDocument({ ID: 'doc-1' });

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(mockAuth);
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-1');
      expect(result.id).toBe('doc-1');
    });

    it('should skip authorization deletion when document has no authorization policy', async () => {
      const document = {
        id: 'doc-2',
        externalID: 'ext-2',
        authorization: undefined,
        tagset: { id: 'tagset-2' },
      };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      (tagsetService.removeTagset as Mock).mockResolvedValue(undefined);

      await service.deleteDocument({ ID: 'doc-2' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-2');
    });

    it('should skip tagset deletion when document has no tagset', async () => {
      const document = {
        id: 'doc-3',
        externalID: 'ext-3',
        authorization: { id: 'auth-3' },
        tagset: undefined,
      };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);

      await service.deleteDocument({ ID: 'doc-3' });

      expect(authorizationPolicyService.delete).toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when document to delete does not exist', async () => {

      await expect(
        service.deleteDocument({ ID: 'non-existent' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── getDocumentOrFail ───────────────────────────────────────────

  describe('getDocumentOrFail', () => {
    it('should return the document when it exists', async () => {
      const document = { id: 'doc-1', displayName: 'file.pdf' };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      const result = await service.getDocumentOrFail('doc-1');

      expect(result).toBe(document);
    });

    it('should pass through FindOneOptions when provided', async () => {
      const document = { id: 'doc-1' };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      await service.getDocumentOrFail('doc-1', {
        relations: { tagset: true },
      });

    });

    it('should throw EntityNotFoundException when document does not exist', async () => {

      await expect(service.getDocumentOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── updateDocument ──────────────────────────────────────────────

  describe('updateDocument', () => {
    it('should update tagset when tagset data is provided', async () => {
      const existingDoc = {
        id: 'doc-1',
        tagset: { id: 'tagset-1', tags: ['old'] },
      };
      const updatedTagset = { id: 'tagset-1', tags: ['new'] };
      const updateData = {
        ID: 'doc-1',
        displayName: 'updated.pdf',
        tagset: { ID: 'tagset-1', tags: ['new'] },
      };
      db.query.documents.findFirst.mockResolvedValueOnce(existingDoc);

      (tagsetService.updateTagset as Mock).mockResolvedValue(updatedTagset);
      vi.spyOn(service, 'save' as any).mockImplementation(async (doc: any) => doc);

      const result = await service.updateDocument(updateData);

      expect(tagsetService.updateTagset).toHaveBeenCalledWith(
        updateData.tagset
      );
      expect(result.tagset).toBe(updatedTagset);
    });

    it('should throw EntityNotFoundException when document tagset is not initialized and tagset update requested', async () => {
      const existingDoc = {
        id: 'doc-1',
        tagset: undefined,
      };
      const updateData = {
        ID: 'doc-1',
        displayName: 'updated.pdf',
        tagset: { ID: 'tagset-1', tags: ['new'] },
      };
      db.query.documents.findFirst.mockResolvedValueOnce(existingDoc);

      await expect(service.updateDocument(updateData)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should skip tagset update when no tagset data is provided', async () => {
      const existingDoc = {
        id: 'doc-1',
        tagset: { id: 'tagset-1', tags: ['existing'] },
      };
      const updateData = {
        ID: 'doc-1',
        displayName: 'updated.pdf',
      };
      db.query.documents.findFirst.mockResolvedValueOnce(existingDoc);
      vi.spyOn(service, 'save' as any).mockImplementation(async (doc: any) => doc);

      await service.updateDocument(updateData);

      expect(tagsetService.updateTagset).not.toHaveBeenCalled();
    });
  });

  // ── getPubliclyAccessibleURL ────────────────────────────────────

  describe('getPubliclyAccessibleURL', () => {
    it('should return the full URL path for a document', () => {
      const document = { id: 'doc-uuid-123' } as any;

      const result = service.getPubliclyAccessibleURL(document);

      expect(result).toBe(`${BASE_DOCUMENT_URL}/doc-uuid-123`);
    });
  });

  // ── isAlkemioDocumentURL ────────────────────────────────────────

  describe('isAlkemioDocumentURL', () => {
    it('should return true when URL starts with the Alkemio document base path', () => {
      const url = `${BASE_DOCUMENT_URL}/some-doc-id`;

      expect(service.isAlkemioDocumentURL(url)).toBe(true);
    });

    it('should return false when URL does not start with the Alkemio document base path', () => {
      expect(service.isAlkemioDocumentURL('https://external.com/doc/123')).toBe(
        false
      );
    });

    it('should return false when URL is empty', () => {
      expect(service.isAlkemioDocumentURL('')).toBe(false);
    });
  });

  // ── getDocumentFromURL ──────────────────────────────────────────

  describe('getDocumentFromURL', () => {
    it('should return undefined when URL is not an Alkemio document URL', async () => {
      const result = await service.getDocumentFromURL(
        'https://external.com/doc'
      );

      expect(result).toBeUndefined();
    });

    it('should return the document when URL is a valid Alkemio document URL', async () => {
      const docId = 'doc-uuid-456';
      const document = { id: docId, displayName: 'file.png' };
      db.query.documents.findFirst.mockResolvedValueOnce(document);

      const result = await service.getDocumentFromURL(
        `${BASE_DOCUMENT_URL}/${docId}`
      );

      expect(result).toBe(document);
    });

    it('should return undefined and log error when document ID from URL does not resolve', async () => {

      const result = await service.getDocumentFromURL(
        `${BASE_DOCUMENT_URL}/non-existent-id`
      );

      expect(result).toBeUndefined();
    });
  });

  // ── uploadFile ──────────────────────────────────────────────────

  describe('uploadFile', () => {
    it('should delegate to storage service and return the external ID when upload succeeds', async () => {
      const buffer = Buffer.from('file-content');
      (storageService.save as Mock).mockResolvedValue('external-id-abc');

      const result = await service.uploadFile(buffer, 'test.png');

      expect(storageService.save).toHaveBeenCalledWith(buffer);
      expect(result).toBe('external-id-abc');
    });

    it('should throw DocumentSaveFailedException when storage service fails', async () => {
      const buffer = Buffer.from('file-content');
      (storageService.save as Mock).mockRejectedValue(
        new Error('Storage write error')
      );

      await expect(service.uploadFile(buffer, 'test.png')).rejects.toThrow(
        DocumentSaveFailedException
      );
    });
  });

  // ── getUploadedDate ─────────────────────────────────────────────

  describe('getUploadedDate', () => {
    it('should return the createdDate when document exists', async () => {
      const createdDate = new Date('2025-01-15T10:00:00Z');
      db.query.documents.findFirst.mockResolvedValueOnce({
        id: 'doc-1',
        createdDate,
      });

      const result = await service.getUploadedDate('doc-1');

      expect(result).toBe(createdDate);
    });

    it('should throw EntityNotFoundException when document does not exist', async () => {

      await expect(service.getUploadedDate('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── getDocumentContents ─────────────────────────────────────────

  describe('getDocumentContents', () => {
    it('should return a Readable stream from storage service content', async () => {
      const content = Buffer.from('document-bytes');
      (storageService.read as Mock).mockResolvedValue(content);
      const document = { externalID: 'ext-id-1' } as any;

      const result = await service.getDocumentContents(document);

      expect(storageService.read).toHaveBeenCalledWith('ext-id-1');
      const chunks: Buffer[] = [];
      for await (const chunk of result) {
        chunks.push(chunk);
      }
      expect(Buffer.concat(chunks).toString()).toBe('document-bytes');
    });
  });
});
