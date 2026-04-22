import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { Document } from './document.entity';
import { DocumentService } from './document.service';

const HOSTING_CONFIG = {
  endpoint_cluster: 'https://alkem.io',
  path_api_private_rest: '/api/private/rest',
};
const BASE_DOCUMENT_URL = `${HOSTING_CONFIG.endpoint_cluster}${HOSTING_CONFIG.path_api_private_rest}/storage/document`;

describe('DocumentService', () => {
  let service: DocumentService;
  let documentRepository: Repository<Document>;
  let tagsetService: TagsetService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let fileServiceAdapter: FileServiceAdapter;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // Mock static Document.create to avoid DataSource requirement
    vi.spyOn(Document, 'create').mockImplementation((input: any) => {
      const entity = new Document();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        repositoryProviderMockFactory(Document),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: FileServiceAdapter,
          useValue: {
            createDocument: vi.fn(),
            getDocumentContent: vi.fn(),
            updateDocument: vi.fn(),
            deleteDocument: vi.fn(),
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
    documentRepository = module.get<Repository<Document>>(
      getRepositoryToken(Document)
    );
    tagsetService = module.get<TagsetService>(TagsetService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    fileServiceAdapter = module.get<FileServiceAdapter>(FileServiceAdapter);
  });

  // ── deleteDocument ──────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('should delegate deletion to file-service adapter and clean up auth policy and tagset', async () => {
      const document = {
        id: 'doc-1',
        externalID: 'ext-1',
        authorization: { id: 'auth-1' },
        tagset: { id: 'tagset-1' },
      };
      (documentRepository.findOne as Mock).mockResolvedValue(document);
      (fileServiceAdapter.deleteDocument as Mock).mockResolvedValue({
        authorizationId: 'auth-1',
        tagsetId: 'tagset-1',
      });
      (authorizationPolicyService.deleteById as Mock).mockResolvedValue(
        undefined
      );
      (tagsetService.removeTagset as Mock).mockResolvedValue(undefined);

      const result = await service.deleteDocument({ ID: 'doc-1' });

      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith('doc-1');
      expect(authorizationPolicyService.deleteById).toHaveBeenCalledWith(
        'auth-1'
      );
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-1');
      expect(result.id).toBe('doc-1');
    });

    it('should skip authorization deletion when file-service returns no authorizationId', async () => {
      const document = {
        id: 'doc-2',
        externalID: 'ext-2',
        authorization: undefined,
        tagset: { id: 'tagset-2' },
      };
      (documentRepository.findOne as Mock).mockResolvedValue(document);
      (fileServiceAdapter.deleteDocument as Mock).mockResolvedValue({
        authorizationId: '',
        tagsetId: 'tagset-2',
      });
      (tagsetService.removeTagset as Mock).mockResolvedValue(undefined);

      await service.deleteDocument({ ID: 'doc-2' });

      expect(authorizationPolicyService.deleteById).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-2');
    });

    it('should skip tagset deletion when file-service returns no tagsetId', async () => {
      const document = {
        id: 'doc-3',
        externalID: 'ext-3',
        authorization: { id: 'auth-3' },
        tagset: undefined,
      };
      (documentRepository.findOne as Mock).mockResolvedValue(document);
      (fileServiceAdapter.deleteDocument as Mock).mockResolvedValue({
        authorizationId: 'auth-3',
        tagsetId: null,
      });
      (authorizationPolicyService.deleteById as Mock).mockResolvedValue(
        undefined
      );

      await service.deleteDocument({ ID: 'doc-3' });

      expect(authorizationPolicyService.deleteById).toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when document to delete does not exist', async () => {
      (documentRepository.findOne as Mock).mockResolvedValue(null);

      await expect(
        service.deleteDocument({ ID: 'non-existent' })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── getDocumentOrFail ───────────────────────────────────────────

  describe('getDocumentOrFail', () => {
    it('should return the document when it exists', async () => {
      const document = { id: 'doc-1', displayName: 'file.pdf' };
      (documentRepository.findOne as Mock).mockResolvedValue(document);

      const result = await service.getDocumentOrFail('doc-1');

      expect(result).toBe(document);
      expect(documentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-1' },
        })
      );
    });

    it('should pass through FindOneOptions when provided', async () => {
      const document = { id: 'doc-1' };
      (documentRepository.findOne as Mock).mockResolvedValue(document);

      await service.getDocumentOrFail('doc-1', {
        relations: { tagset: true },
      });

      expect(documentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-1' },
          relations: { tagset: true },
        })
      );
    });

    it('should throw EntityNotFoundException when document does not exist', async () => {
      (documentRepository.findOne as Mock).mockResolvedValue(null);

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
        tagset: { ID: 'tagset-1', tags: ['new'] },
      };

      (documentRepository.findOne as Mock).mockResolvedValue(existingDoc);
      (tagsetService.updateTagset as Mock).mockResolvedValue(updatedTagset);

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
        tagset: { ID: 'tagset-1', tags: ['new'] },
      };

      (documentRepository.findOne as Mock).mockResolvedValue(existingDoc);

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
      };

      (documentRepository.findOne as Mock).mockResolvedValue(existingDoc);

      await service.updateDocument(updateData);

      expect(tagsetService.updateTagset).not.toHaveBeenCalled();
    });

    it('should throw ValidationException when displayName is provided (unsupported field)', async () => {
      const updateData = {
        ID: 'doc-1',
        displayName: 'new-name.pdf',
      };

      await expect(service.updateDocument(updateData)).rejects.toThrow(
        'Document display name cannot be updated'
      );
      expect(documentRepository.findOne).not.toHaveBeenCalled();
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
      (documentRepository.findOne as Mock).mockResolvedValue(document);

      const result = await service.getDocumentFromURL(
        `${BASE_DOCUMENT_URL}/${docId}`
      );

      expect(result).toBe(document);
    });

    it('should return undefined and log error when document ID from URL does not resolve', async () => {
      (documentRepository.findOne as Mock).mockResolvedValue(null);

      const result = await service.getDocumentFromURL(
        `${BASE_DOCUMENT_URL}/non-existent-id`
      );

      expect(result).toBeUndefined();
    });
  });

  // ── getUploadedDate ─────────────────────────────────────────────

  describe('getUploadedDate', () => {
    it('should return the createdDate when document exists', async () => {
      const createdDate = new Date('2025-01-15T10:00:00Z');
      (documentRepository.findOne as Mock).mockResolvedValue({
        id: 'doc-1',
        createdDate,
      });

      const result = await service.getUploadedDate('doc-1');

      expect(result).toBe(createdDate);
    });

    it('should throw EntityNotFoundException when document does not exist', async () => {
      (documentRepository.findOne as Mock).mockResolvedValue(null);

      await expect(service.getUploadedDate('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
