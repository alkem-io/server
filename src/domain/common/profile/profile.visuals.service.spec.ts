import { Test, TestingModule } from '@nestjs/testing';
import { ProfileVisualsService } from './profile.visuals.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { uniqueId } from 'lodash';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { IAuthorizationPolicy } from '../authorization-policy';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetType } from '@common/enums/tagset.type';
import { IDocument } from '@domain/storage/document';

const ALKEMIO_URL = 'https://alkem.io';
const EXAMPLE_DOCUMENT_UUID = '88bd49d1-871d-479a-94b5-d905c93a97de';
const EXAMPLE_ALKEMIO_DOCUMENT_URL = `${ALKEMIO_URL}/api/private/rest/storage/document/${EXAMPLE_DOCUMENT_UUID}`;

const mockAuth = (
  type: AuthorizationPolicyType,
  props?: Partial<IAuthorizationPolicy>
): IAuthorizationPolicy => ({
  anonymousReadAccess: false,
  credentialRules: '',
  verifiedCredentialRules: '',
  privilegeRules: '',
  id: uniqueId(),
  ...props,
  type,
});

const mockStorageBucket = (props?: Partial<IStorageBucket>): IStorageBucket => {
  return {
    id: uniqueId(),
    documents: [],
    allowedMimeTypes: [],
    maxFileSize: 2000,
    ...props,
  };
};

const mockDocument = (
  storageBucket: IStorageBucket,
  props?: Partial<IDocument>
): IDocument => {
  const doc = {
    id: uniqueId(),
    createdBy: 'user1',
    externalID: uniqueId(),
    displayName: 'img1.png',
    mimeType: MimeTypeVisual.PNG,
    size: 20000,
    tagset: {
      id: 'tagset1',
      name: 'default',
      type: TagsetType.FREEFORM,
      tags: [],
    },
    authorization: mockAuth(AuthorizationPolicyType.DOCUMENT),
    temporaryLocation: false,
    ...props,
    storageBucket,
  };
  storageBucket.documents.push(doc);
  return doc;
};

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
            //getDocumentsBaseUrlPath: jest.fn(),
            isAlkemioDocumentURL: jest.fn(),
            getDocumentFromURL: jest.fn(),
            getPubliclyAccessibleURL: jest.fn(),
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
  describe('reuploadFileOnStorageBucket', () => {
    it('should return fileUrl if internalUrlRequired is false and URL is not an Alkemio document', async () => {
      const fileUrl = 'http://external.com/doc/1234';
      const storageBucket = mockStorageBucket();

      jest
        .spyOn(documentService, 'isAlkemioDocumentURL')
        .mockReturnValue(false);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        false
      );

      expect(result).toBe(fileUrl);
    });

    it('should return undefined if internalUrlRequired is true and URL is not an Alkemio document', async () => {
      const fileUrl = 'http://external.com/doc/1234';
      const storageBucket = mockStorageBucket();

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

    it('should return the same url if the file is already in the same stoarge bucket', async () => {
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucket: IStorageBucket = mockStorageBucket();
      const doc = mockDocument(storageBucket);

      jest.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      jest.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      jest
        .spyOn(documentService, 'getPubliclyAccessibleURL')
        .mockReturnValue(EXAMPLE_ALKEMIO_DOCUMENT_URL);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        true
      );

      expect(result).toBe(fileUrl);
    });

    it('should return the same document but moved to the new StorageBucket and not temporary anymore', async () => {
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucketOrigin: IStorageBucket = mockStorageBucket();
      const storageBucketDestination: IStorageBucket = mockStorageBucket();
      // A few test documents
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);
      mockDocument(storageBucketDestination);
      // the doc
      const doc = mockDocument(storageBucketOrigin, {
        temporaryLocation: false,
      });
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);

      jest.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      jest.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      jest
        .spyOn(documentService, 'getPubliclyAccessibleURL')
        .mockReturnValue(EXAMPLE_ALKEMIO_DOCUMENT_URL);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true
      );

      expect(result).toBe(fileUrl);
      expect(doc.temporaryLocation).toBe(false);
      expect(doc.storageBucket).toBe(storageBucketDestination);
    });

    it('should return a copy of the document in the new StorageBucket', async () => {
      const fileUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
      const storageBucketOrigin: IStorageBucket = mockStorageBucket();
      const storageBucketDestination: IStorageBucket = mockStorageBucket();
      // A few test documents
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);
      mockDocument(storageBucketDestination);
      // the doc
      const doc = mockDocument(storageBucketOrigin, {
        temporaryLocation: true,
      });
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);

      jest.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      jest.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      const resultUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
      jest
        .spyOn(documentService, 'getPubliclyAccessibleURL')
        .mockReturnValue(resultUrl);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true
      );

      expect(result).toBe(resultUrl);
      expect(result !== fileUrl).toBe(true);
      expect(storageBucketDestination.documents).toHaveLength(4);
      const newDoc = storageBucketDestination.documents[3];
      expect(newDoc.storageBucket).toBe(storageBucketDestination);
      expect(newDoc.id === doc.id).toBe(false);
      expect(newDoc.externalID === doc.externalID).toBe(true);
      expect(newDoc.temporaryLocation).toBe(false);
      expect(newDoc.displayName === doc.displayName).toBe(true);
    });
    /*
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
  */
  });
});
