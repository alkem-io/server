import { Test, TestingModule } from '@nestjs/testing';
import { ProfileVisualsService } from './profile.visuals.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { EntityNotInitializedException } from '@common/exceptions';
import { NotFoundException } from '@nestjs/common';

// ChatGPT generated tests, not ready yet

const ALKEMIO_URL = 'https://alkem.io';
const DOUMENT_URL = (uuid: string) =>
  `${ALKEMIO_URL}/api/private/rest/storage/document/${uuid}`;
const example_document_url = `${ALKEMIO_URL}/api/private/rest/storage/document/88bd49d1-871d-479a-94b5-d905c93a97de`;

describe('ProfileVisualsService', () => {
  let service: ProfileVisualsService;
  let documentService: DocumentService;
  let storageBucketService: StorageBucketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileVisualsService,
        {
          provide: DocumentService,
          useValue: {
            getDocumentsBaseUrlPath: jest.fn(),
            isAlkemioDocumentURL: jest.fn(),
            getDocumentFromURL: jest.fn(),
          },
        },
        {
          provide: StorageBucketService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProfileVisualsService>(ProfileVisualsService);
    documentService = module.get<DocumentService>(DocumentService);
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
  });

  describe('reuploadDocumentsInMarkdownProfile', () => {
    it('should replace document URLs in markdown', async () => {
      const markdown = `Some text with a document URL: ${ALKEMIO_URL}/private/http://example.com/doc/1234  and another one with an alkemio url: `;
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };
      const newUrl = 'http://newurl.com/doc/1234';

      jest
        .spyOn(documentService, 'getDocumentsBaseUrlPath')
        .mockReturnValue(ALKEMIO_URL);
      jest
        .spyOn(service, 'reuploadFileOnStorageBucket')
        .mockResolvedValue(newUrl);

      const result = await service.reuploadDocumentsInMarkdownProfile(
        markdown,
        storageBucket
      );

      expect(result).toContain(newUrl);
    });
  });

  describe('reuploadFileOnStorageBucket', () => {
    it('should return undefined if alkemioRequired is true and URL is not an Alkemio document', async () => {
      const fileUrl = 'http://external.com/doc/1234';
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };

      jest
        .spyOn(documentService, 'isAlkemioDocumentURL')
        .mockReturnValue(false);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        true
      );

      expect(result).toBeUndefined();
    });

    it('should throw EntityNotInitializedException if documents are not initialized', async () => {
      const fileUrl = 'http://example.com/doc/1234';
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };

      await expect(
        service.reuploadFileOnStorageBucket(fileUrl, storageBucket, false)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should reupload file and return new URL', async () => {
      const fileUrl = 'http://example.com/doc/1234';
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };
      const newUrl = 'http://newurl.com/doc/1234';

      jest.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      jest.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue({
        id: 'doc1',
        storageBucket,
        tagset,
        displayName,
        createdBy,
      });
      jest
        .spyOn(storageBucketService, 'uploadDocument')
        .mockResolvedValue(newUrl);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        false
      );

      expect(result).toBe(newUrl);
    });

    it('should handle NotFoundException when document is not found', async () => {
      const fileUrl = 'http://example.com/doc/1234';
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };

      jest.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      jest
        .spyOn(documentService, 'getDocumentFromURL')
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.reuploadFileOnStorageBucket(fileUrl, storageBucket, false)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reuploadDocumentsInMarkdownProfile', () => {
    it('should replace multiple document URLs in markdown', async () => {
      const markdown = `Some text with a document URL: ${ALKEMIO_URL}/private/http://example.com/doc/1234 and another one: ${ALKEMIO_URL}/private/http://example.com/doc/5678`;
      const storageBucket: IStorageBucket = {
        id: 'bucket1',
        documents: [],
        allowedMimeTypes: [],
        maxFileSize: 2000,
      };
      const newUrl1 = 'http://newurl.com/doc/1234';
      const newUrl2 = 'http://newurl.com/doc/5678';

      jest
        .spyOn(documentService, 'getDocumentsBaseUrlPath')
        .mockReturnValue(ALKEMIO_URL);
      jest
        .spyOn(service, 'reuploadFileOnStorageBucket')
        .mockResolvedValueOnce(newUrl1)
        .mockResolvedValueOnce(newUrl2);

      const result = await service.reuploadDocumentsInMarkdownProfile(
        markdown,
        storageBucket
      );

      expect(result).toContain(newUrl1);
      expect(result).toContain(newUrl2);
    });
  });
});
