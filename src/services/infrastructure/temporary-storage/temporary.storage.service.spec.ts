import { DocumentService } from '@domain/storage/document/document.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { TemporaryStorageService } from './temporary.storage.service';

describe('TemporaryStorageService', () => {
  let service: TemporaryStorageService;
  let documentService: {
    getDocumentsBaseUrlPath: Mock;
    getDocumentOrFail: Mock;
    save: Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemporaryStorageService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TemporaryStorageService);
    documentService = module.get(DocumentService) as any;
  });

  describe('moveTemporaryDocuments', () => {
    const storageBucket = { id: 'bucket-1' } as any;

    it('should move documents that are in temporary location to the destination bucket', async () => {
      const docId = '0d4564f7-2194-42e4-b4c1-60314765a3e0';
      const mockDocument = {
        id: docId,
        temporaryLocation: true,
        storageBucket: null,
      } as any;
      documentService.getDocumentsBaseUrlPath.mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document'
      );
      documentService.getDocumentOrFail.mockResolvedValue(mockDocument);
      documentService.save.mockResolvedValue(mockDocument);

      const inputDTO = {
        description: `Check out https://alkem.io/api/private/rest/storage/document/${docId}`,
      } as any;

      await service.moveTemporaryDocuments(inputDTO, storageBucket);

      expect(documentService.save).toHaveBeenCalledWith(mockDocument);
      expect(mockDocument.storageBucket).toBe(storageBucket);
      expect(mockDocument.temporaryLocation).toBe(false);
    });

    it('should not save documents that are not in temporary location', async () => {
      const docId = '0d4564f7-2194-42e4-b4c1-60314765a3e0';
      const mockDocument = {
        id: docId,
        temporaryLocation: false,
        storageBucket: { id: 'existing-bucket' },
      } as any;
      documentService.getDocumentsBaseUrlPath.mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document'
      );
      documentService.getDocumentOrFail.mockResolvedValue(mockDocument);

      const inputDTO = {
        description: `See https://alkem.io/api/private/rest/storage/document/${docId}`,
      } as any;

      await service.moveTemporaryDocuments(inputDTO, storageBucket);

      expect(documentService.save).not.toHaveBeenCalled();
    });

    it('should handle input with no document URLs gracefully', async () => {
      documentService.getDocumentsBaseUrlPath.mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document'
      );

      const inputDTO = { description: 'No documents here' } as any;

      await service.moveTemporaryDocuments(inputDTO, storageBucket);

      expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
      expect(documentService.save).not.toHaveBeenCalled();
    });

    it('should handle multiple document URLs in the same input', async () => {
      const docId1 = '0d4564f7-2194-42e4-b4c1-60314765a3e0';
      const docId2 = '1e5675f8-3305-53f5-c5d2-71425876b1f1';
      const doc1 = { id: docId1, temporaryLocation: true } as any;
      const doc2 = { id: docId2, temporaryLocation: true } as any;

      documentService.getDocumentsBaseUrlPath.mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document'
      );
      documentService.getDocumentOrFail
        .mockResolvedValueOnce(doc1)
        .mockResolvedValueOnce(doc2);
      documentService.save.mockResolvedValue(undefined);

      const inputDTO = {
        description: `Doc1: https://alkem.io/api/private/rest/storage/document/${docId1} and Doc2: https://alkem.io/api/private/rest/storage/document/${docId2}`,
      } as any;

      await service.moveTemporaryDocuments(inputDTO, storageBucket);

      expect(documentService.save).toHaveBeenCalledTimes(2);
    });

    it('should gracefully handle when getDocumentOrFail throws an error for a document URL', async () => {
      const docId = '0d4564f7-2194-42e4-b4c1-60314765a3e0';
      documentService.getDocumentsBaseUrlPath.mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document'
      );
      documentService.getDocumentOrFail.mockRejectedValue(
        new Error('Document not found')
      );

      const inputDTO = {
        description: `https://alkem.io/api/private/rest/storage/document/${docId}`,
      } as any;

      // Should not throw - the service catches errors internally
      await service.moveTemporaryDocuments(inputDTO, storageBucket);

      expect(documentService.save).not.toHaveBeenCalled();
    });
  });
});
