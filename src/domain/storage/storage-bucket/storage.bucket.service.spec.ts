import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  MimeFileType,
} from '@common/enums/mime.file.type';
import { MimeTypeDocument } from '@common/enums/mime.file.type.document';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Readable } from 'stream';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { Document } from '../document/document.entity';
import { IDocument } from '../document/document.interface';
import { DocumentService } from '../document/document.service';
import { StorageBucket } from './storage.bucket.entity';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketService } from './storage.bucket.service';

// ── Helpers ───────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

const mockStorageBucket = (
  overrides?: Partial<IStorageBucket>
): IStorageBucket => ({
  id: nextId(),
  documents: [],
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  maxFileSize: 15728640, // 15 MB default
  createdDate: new Date(),
  updatedDate: new Date(),
  ...overrides,
});

const mockDocument = (overrides?: Partial<IDocument>): IDocument =>
  ({
    id: nextId(),
    displayName: 'test.png',
    mimeType: MimeTypeVisual.PNG,
    size: 1024,
    externalID: nextId(),
    temporaryLocation: false,
    createdDate: new Date(),
    updatedDate: new Date(),
    authorization: {
      id: nextId(),
      type: AuthorizationPolicyType.DOCUMENT,
      credentialRules: [],
      privilegeRules: [],
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    tagset: {
      id: nextId(),
      name: 'default',
      tags: [],
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    ...overrides,
  }) as any;

describe('StorageBucketService', () => {
  let service: StorageBucketService;
  let storageBucketRepository: Repository<StorageBucket>;
  let _documentRepository: Repository<Document>;
  let profileRepository: Repository<Profile>;
  let documentService: DocumentService;
  let documentAuthorizationService: DocumentAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let authorizationService: AuthorizationService;
  let avatarCreatorService: AvatarCreatorService;
  let urlGeneratorService: UrlGeneratorService;
  let fileServiceAdapter: FileServiceAdapter;
  let tagsetService: TagsetService;
  let configService: ConfigService;
  let signingAttemptService: SigningAttemptService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    idCounter = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBucketService,
        repositoryProviderMockFactory(StorageBucket),
        repositoryProviderMockFactory(Document),
        repositoryProviderMockFactory(Profile),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: FileServiceAdapter,
          useValue: {
            createDocument: vi.fn(),
            createDocumentFromStream: vi.fn(),
            copyDocument: vi.fn(),
            getDocumentContent: vi.fn(),
            updateDocument: vi.fn(),
            deleteDocument: vi.fn(),
          },
        },
        {
          provide: DocumentAuthorizationService,
          useValue: {
            applyAuthorizationPolicy: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageBucketService>(StorageBucketService);
    storageBucketRepository = module.get<Repository<StorageBucket>>(
      getRepositoryToken(StorageBucket)
    );
    _documentRepository = module.get<Repository<Document>>(
      getRepositoryToken(Document)
    );
    profileRepository = module.get<Repository<Profile>>(
      getRepositoryToken(Profile)
    );
    documentService = module.get<DocumentService>(DocumentService);
    (documentService.isUserFacingDocument as Mock).mockImplementation(
      document => Boolean(document.authorization)
    );
    documentAuthorizationService = module.get<DocumentAuthorizationService>(
      DocumentAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    avatarCreatorService =
      module.get<AvatarCreatorService>(AvatarCreatorService);
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
    fileServiceAdapter = module.get<FileServiceAdapter>(FileServiceAdapter);
    tagsetService = module.get<TagsetService>(TagsetService);
    configService = module.get<ConfigService>(ConfigService);
    signingAttemptService = module.get(SigningAttemptService);
    (signingAttemptService.existsForDocumentIDs as Mock).mockResolvedValue(
      false
    );
  });

  // ── createStorageBucket ─────────────────────────────────────────

  describe('createStorageBucket', () => {
    it('should create a storage bucket with default allowed MIME types and max file size when no overrides given', () => {
      const result = service.createStorageBucket({});

      expect(result.authorization).toBeDefined();
      expect(result.documents).toEqual([]);
      expect(result.allowedMimeTypes).toEqual(DEFAULT_ALLOWED_MIME_TYPES);
      expect(result.maxFileSize).toBe(15728640);
    });

    it('should use custom allowed MIME types when provided', () => {
      const customTypes = [
        MimeTypeVisual.PNG,
        MimeTypeVisual.JPEG,
      ] as MimeFileType[];

      const result = service.createStorageBucket({
        allowedMimeTypes: customTypes,
      });

      expect(result.allowedMimeTypes).toEqual(customTypes);
    });

    it('should use custom max file size when provided', () => {
      const result = service.createStorageBucket({
        maxFileSize: 5000000,
      });

      expect(result.maxFileSize).toBe(5000000);
    });

    it('should assign storage aggregator when provided in input', () => {
      const mockAggregator = { id: 'agg-1' } as any;

      const result = service.createStorageBucket({
        storageAggregator: mockAggregator,
      });

      expect(result.storageAggregator).toBe(mockAggregator);
    });
  });

  // ── deleteStorageBucket ─────────────────────────────────────────

  describe('deleteStorageBucket', () => {
    it('refuses before deleting authorization or documents when a signing attempt references a document', async () => {
      const bucket = {
        id: 'bucket-signing',
        authorization: { id: 'auth-signing' },
        documents: [{ id: 'doc-signing' }],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (signingAttemptService.existsForDocumentIDs as Mock).mockResolvedValue(
        true
      );

      await expect(
        service.deleteStorageBucket('bucket-signing')
      ).rejects.toThrow(ValidationException);

      expect(signingAttemptService.existsForDocumentIDs).toHaveBeenCalledWith([
        'doc-signing',
      ]);
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
      expect(storageBucketRepository.remove).not.toHaveBeenCalled();
    });

    it('should delete authorization, all documents, and remove bucket when bucket exists', async () => {
      const doc1 = { id: 'doc-1' };
      const doc2 = { id: 'doc-2' };
      const bucket = {
        id: 'bucket-1',
        authorization: { id: 'auth-1' },
        documents: [doc1, doc2],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (documentService.deleteDocument as Mock).mockResolvedValue(undefined);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      const result = await service.deleteStorageBucket('bucket-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        bucket.authorization
      );
      expect(documentService.deleteDocument).toHaveBeenCalledTimes(2);
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'doc-1',
      });
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'doc-2',
      });
      expect(storageBucketRepository.remove).toHaveBeenCalled();
      expect(result.id).toBe('bucket-1');
    });

    it('should skip authorization deletion when bucket has no authorization', async () => {
      const bucket = {
        id: 'bucket-2',
        authorization: undefined,
        documents: [],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      await service.deleteStorageBucket('bucket-2');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip document deletion when bucket has no documents', async () => {
      const bucket = {
        id: 'bucket-3',
        authorization: { id: 'auth-3' },
        documents: undefined,
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      await service.deleteStorageBucket('bucket-3');

      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // ── deleteStorageBucketForAccountDeletion ────────────────────────

  describe('deleteStorageBucketForAccountDeletion', () => {
    it('refuses before transactional authorization cleanup when a signing attempt references a document', async () => {
      const bucket = {
        id: 'bucket-signing',
        authorization: { id: 'auth-signing' },
        documents: [{ id: 'doc-signing' }],
      };
      const em = {
        findOneOrFail: vi.fn().mockResolvedValue(bucket),
      } as any;
      (signingAttemptService.existsForDocumentIDs as Mock).mockResolvedValue(
        true
      );

      await expect(
        service.deleteStorageBucketForAccountDeletion('bucket-signing', em)
      ).rejects.toThrow(ValidationException);

      expect(signingAttemptService.existsForDocumentIDs).toHaveBeenCalledWith([
        'doc-signing',
      ]);
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(documentService.deleteDocumentDbOnly).not.toHaveBeenCalled();
    });

    it('joins the passed EntityManager, never calls the file-service delete, collects external ids, and never removes the bucket or file rows', async () => {
      const doc1 = { id: 'doc-1' };
      const doc2 = { id: 'doc-2' };
      const bucket = {
        id: 'bucket-1',
        authorization: { id: 'auth-1' },
        documents: [doc1, doc2],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (documentService.deleteDocumentDbOnly as Mock)
        .mockResolvedValueOnce({ document: doc1, documentID: 'doc-1' })
        .mockResolvedValueOnce({ document: doc2, documentID: 'doc-2' });
      const em = {
        // The bucket is now READ through the deletion transaction too, so the
        // document list is the one that transaction sees.
        findOneOrFail: vi.fn().mockResolvedValue(bucket),
        remove: vi.fn().mockResolvedValue({ ...bucket, id: '' }),
      } as any;

      const result = await service.deleteStorageBucketForAccountDeletion(
        'bucket-1',
        em
      );

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        bucket.authorization,
        em
      );
      expect(documentService.deleteDocumentDbOnly).toHaveBeenCalledTimes(2);
      expect(documentService.deleteDocumentDbOnly).toHaveBeenCalledWith(
        { ID: 'doc-1' },
        em
      );
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
      // The bucket row (and any `file` row it would cascade) is
      // deliberately left in place — only the post-commit leg (see
      // `removeStorageBucketRowForAccountDeletion`) removes it, once every
      // document has actually gone through the file-service.
      expect(em.remove).not.toHaveBeenCalled();
      expect(result.documentIDs).toEqual(['doc-1', 'doc-2']);
      expect(result.storageBucketID).toBe('bucket-1');
    });
  });

  describe('removeStorageBucketRowForAccountDeletion', () => {
    it('deletes the bucket row directly by id, outside any EntityManager', async () => {
      (storageBucketRepository.delete as Mock).mockResolvedValue({
        affected: 1,
      });

      await service.removeStorageBucketRowForAccountDeletion('bucket-1');

      expect(storageBucketRepository.delete).toHaveBeenCalledWith('bucket-1');
    });
  });

  // ── getStorageBucketOrFail ──────────────────────────────────────

  describe('getStorageBucketOrFail', () => {
    it('should return the storage bucket when it exists', async () => {
      const bucket = { id: 'bucket-1' };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getStorageBucketOrFail('bucket-1');

      expect(result).toBe(bucket);
    });

    it('should throw EntityNotFoundException when storageBucketID is empty', async () => {
      await expect(service.getStorageBucketOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should propagate error when findOneOrFail rejects', async () => {
      (storageBucketRepository.findOneOrFail as Mock).mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        service.getStorageBucketOrFail('non-existent')
      ).rejects.toThrow();
    });
  });

  // ── uploadFileAsDocumentFromBuffer ──────────────────────────────

  describe('uploadFileAsDocumentFromBuffer', () => {
    it('should upload file via file-service adapter and return the created document when MIME type and size are valid', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-upload' });
      const buffer = Buffer.alloc(1024);
      const createdDoc = mockDocument({
        id: 'doc-created',
        displayName: 'file.png',
        externalID: 'ext-new',
      });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-created',
        externalID: 'ext-new',
        mimeType: MimeTypeVisual.PNG,
        size: 1024,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(createdDoc);

      const result = await service.uploadFileAsDocumentFromBuffer(
        'bucket-upload',
        buffer,
        'file.png',
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          displayName: 'file.png',
          storageBucketId: 'bucket-upload',
          authorizationId: 'auth-saved',
          createdBy: 'user-1',
        })
      );
      expect(documentService.getDocumentOrFail).toHaveBeenCalledWith(
        'doc-created',
        {
          relations: {
            authorization: true,
            tagset: { authorization: true },
            storageBucket: true,
          },
        }
      );
      expect(result).toBe(createdDoc);
    });

    // A1: a conversation bucket is SHARED, and message attachments are
    // attributed by `createdBy` on both the send and the read path. Per-bucket
    // CONTENT dedup handed a second uploader the FIRST uploader's (durable)
    // row, which then failed both the sender-ownership gate and the single-use
    // gate — so an already-shared file could never be sent again by anyone.
    describe('A1: conversation buckets never content-dedup', () => {
      const arrangeUpload = (bucket: IStorageBucket) => {
        const created = mockDocument({ id: 'doc-created' });
        (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
          bucket
        );
        (authorizationPolicyService.save as Mock).mockResolvedValue({
          id: 'auth-saved',
        });
        (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
          id: 'doc-created',
          externalID: 'ext-shared',
          reused: false,
        });
        (documentService.getDocumentOrFail as Mock).mockResolvedValue(created);
      };

      it('forces skipDedup so a SECOND sender gets their OWN row for identical bytes', async () => {
        arrangeUpload(
          mockStorageBucket({
            id: 'bucket-conversation',
            storageAggregator: {
              id: 'agg-conversation',
              type: StorageAggregatorType.CONVERSATION,
            } as any,
          })
        );

        // Bob uploads the exact bytes Alice already sent into this conversation.
        await service.uploadFileAsDocumentFromBuffer(
          'bucket-conversation',
          Buffer.alloc(1024),
          'logo.png',
          MimeTypeVisual.PNG,
          'bob',
          true // temporaryLocation — an unsent attachment upload
        );

        expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ skipDedup: true, createdBy: 'bob' })
        );
      });

      it('does NOT force skipDedup for a DURABLE upload into a CONVERSATION bucket', async () => {
        // The bucket-type leg was removed with the creator/single-use gates it
        // existed for. Conversation files are durable on upload and dedup like
        // any other durable upload; only STAGED uploads still need their own row.
        const bucket = mockStorageBucket({
          id: 'bucket-conv',
          storageAggregator: {
            type: StorageAggregatorType.CONVERSATION,
          } as any,
        });
        (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
          bucket
        );
        (authorizationPolicyService.save as Mock).mockResolvedValue({
          id: 'auth-saved',
        });
        (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
          id: 'doc-conv',
          externalID: 'ext',
          mimeType: MimeTypeVisual.PNG,
          size: 3,
        });
        (documentService.getDocumentOrFail as Mock).mockResolvedValue(
          mockDocument()
        );

        await service.uploadFileAsDocumentFromBuffer(
          'bucket-conv',
          Buffer.from('png'),
          'photo.png',
          MimeTypeVisual.PNG,
          'bob',
          false
        );

        const [, metadata] = (fileServiceAdapter.createDocument as Mock).mock
          .calls[0];
        expect(metadata.skipDedup).toBeUndefined();
      });

      it('forces skipDedup for a STAGED upload into a callout collaboration bucket (comment-room attachments)', async () => {
        // A callout/post comment-room attachment uploads into the parent
        // callout's collaboration bucket, which hangs off the SPACE aggregator
        // — so the conversation-bucket rule does not reach it. Without this,
        // file-service content-dedup hands the sender the callout's own
        // pre-existing DURABLE row and resolveOutboundAttachments then rejects
        // an ordinary file with 'Attachment is not owned by the sender' /
        // 'Attachment has already been sent'.
        arrangeUpload(
          mockStorageBucket({
            id: 'bucket-callout-collaboration',
            storageAggregator: {
              id: 'agg-space',
              type: StorageAggregatorType.SPACE,
            } as any,
          })
        );

        await service.uploadFileAsDocumentFromBuffer(
          'bucket-callout-collaboration',
          Buffer.alloc(1024),
          'logo.png',
          MimeTypeVisual.PNG,
          'bob',
          true // temporaryLocation — an unsent comment-room attachment upload
        );

        expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ skipDedup: true, createdBy: 'bob' })
        );
      });

      it('leaves dedup ON for a DURABLE upload into the same collaboration bucket (callout content is untouched)', async () => {
        // The non-regression half of the rule above: callout/post CONTENT
        // uploads into the very same bucket are durable from the start and must
        // keep deduping exactly as before.
        arrangeUpload(
          mockStorageBucket({
            id: 'bucket-callout-content',
            storageAggregator: {
              id: 'agg-space',
              type: StorageAggregatorType.SPACE,
            } as any,
          })
        );

        await service.uploadFileAsDocumentFromBuffer(
          'bucket-callout-content',
          Buffer.alloc(1024),
          'logo.png',
          MimeTypeVisual.PNG,
          'bob',
          false // temporaryLocation — a normal callout content upload
        );

        expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ skipDedup: undefined })
        );
      });

      it('leaves dedup ON for every other bucket type', async () => {
        arrangeUpload(
          mockStorageBucket({
            id: 'bucket-space',
            storageAggregator: {
              id: 'agg-space',
              type: StorageAggregatorType.SPACE,
            } as any,
          })
        );

        await service.uploadFileAsDocumentFromBuffer(
          'bucket-space',
          Buffer.alloc(1024),
          'logo.png',
          MimeTypeVisual.PNG,
          'bob'
        );

        expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ skipDedup: undefined })
        );
      });

      it('still honours an explicitly requested skipDedup on a non-conversation bucket', async () => {
        arrangeUpload(
          mockStorageBucket({
            id: 'bucket-space-explicit',
            storageAggregator: {
              id: 'agg-space',
              type: StorageAggregatorType.SPACE,
            } as any,
          })
        );

        await service.uploadFileAsDocumentFromBuffer(
          'bucket-space-explicit',
          Buffer.alloc(1024),
          'logo.png',
          MimeTypeVisual.PNG,
          'bob',
          false,
          true // skipDedup
        );

        expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ skipDedup: true })
        );
      });
    });

    it('should throw ValidationException when MIME type is not allowed', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-mime',
        allowedMimeTypes: [MimeTypeVisual.PNG] as MimeFileType[],
      });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-mime',
          buffer,
          'file.pdf',
          MimeTypeDocument.PDF,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when file size exceeds maximum', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-size',
        maxFileSize: 100,
      });
      const buffer = Buffer.alloc(200);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-size',
          buffer,
          'large.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should set temporaryLocation to true when specified', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-temp' });
      const buffer = Buffer.alloc(50);
      const createdDoc = mockDocument();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-temp',
        externalID: 'ext-temp',
        mimeType: MimeTypeVisual.PNG,
        size: 50,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(createdDoc);

      await service.uploadFileAsDocumentFromBuffer(
        'bucket-temp',
        buffer,
        'temp.png',
        MimeTypeVisual.PNG,
        'user-1',
        true
      );

      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          temporaryLocation: true,
        })
      );
    });

    it('PRESERVES auth + tagset when the adapter create call throws, since it may have committed first', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-rb-adapter' });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.createDocument as Mock).mockRejectedValue(
        new Error('adapter failure')
      );

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-rb-adapter',
          buffer,
          'file.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow('adapter failure');

      // The call was INVOKED and then rejected. A lost response is
      // indistinguishable from a failed insert, so a committed row may already
      // reference these — releasing them would strand it unauthorized.
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('PRESERVES the committed Go-side document when a post-call step fails, and keeps its auth + tagset', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-rb-reload' });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-created',
        externalID: 'ext-new',
        mimeType: MimeTypeVisual.PNG,
        size: 100,
      });
      // Reload after Go created the document fails. The row may well be
      // COMMITTED, so deleting it on that suspicion destroys real data. It is
      // left in place, and so are the auth/tagset it references.
      (documentService.getDocumentOrFail as Mock).mockRejectedValue(
        new Error('reload failed')
      );

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-rb-reload',
          buffer,
          'file.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow('reload failed');

      // The Go call SUCCEEDED; only the reload failed. Deleting the row here
      // would destroy a committed document, and freeing its policy/tagset
      // would strand it without authorization.
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('releases pre-created auth + tagset when file-service-go returns reused:true', async () => {
      // Go-side dedup hit the existing file row; the auth/tagset we saved
      // before calling Go are not referenced by anyone and must be freed.
      const bucket = mockStorageBucket({ id: 'bucket-reuse' });
      const buffer = Buffer.alloc(10);
      const existingDoc = mockDocument({
        id: 'doc-existing',
        externalID: 'ext-shared',
      });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved-reuse',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved-reuse',
        authorization: { id: 'tagset-saved-reuse-auth' },
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-existing',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 10,
        reused: true,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        existingDoc
      );

      const result = await service.uploadFileAsDocumentFromBuffer(
        'bucket-reuse',
        buffer,
        'file.png',
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(result).toBe(existingDoc);
      expect(result.reused).toBe(true);
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith({
        id: 'auth-saved-reuse',
      });
      expect(tagsetService.removeTagset).toHaveBeenCalledWith(
        'tagset-saved-reuse'
      );
      // Go-side delete must NOT be called: the reused doc is someone else's.
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('keeps pre-created auth + tagset when reused is false (new document)', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-fresh' });
      const buffer = Buffer.alloc(10);
      const freshDoc = mockDocument({ id: 'doc-fresh' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved-fresh',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved-fresh',
        authorization: { id: 'tagset-saved-fresh-auth' },
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-fresh',
        externalID: 'ext-fresh',
        mimeType: MimeTypeVisual.PNG,
        size: 10,
        reused: false,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(freshDoc);

      const result = await service.uploadFileAsDocumentFromBuffer(
        'bucket-fresh',
        buffer,
        'file.png',
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(result.reused).toBe(false);
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('does NOT delete the Go-side document on post-upload failure if reused:true', async () => {
      // getDocumentOrFail throws AFTER a reuse response. The Go-side document
      // belongs to ANOTHER caller and must never be deleted. The pre-created
      // auth/tagset are not freed in this branch either: the Go call already
      // succeeded, so release is the dedup-reuse path's job, not the catch's.
      const bucket = mockStorageBucket({ id: 'bucket-reuse-reload-fail' });
      const buffer = Buffer.alloc(10);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved-rrf',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved-rrf',
        authorization: { id: 'tagset-saved-rrf-auth' },
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-existing-rrf',
        externalID: 'ext-shared-rrf',
        mimeType: MimeTypeVisual.PNG,
        size: 10,
        reused: true,
      });
      (documentService.getDocumentOrFail as Mock).mockRejectedValue(
        new Error('reload failed')
      );

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-reuse-reload-fail',
          buffer,
          'file.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow('reload failed');

      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });
  });

  // ── copyDocumentToBucket ───────────────────────────────────────

  describe('copyDocumentToBucket', () => {
    const makeSourceDoc = (overrides?: Partial<IDocument>): IDocument =>
      mockDocument({
        id: 'src-doc',
        displayName: 'orig.png',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        externalID: 'ext-shared',
        createdBy: 'user-orig',
        ...overrides,
      });

    it('delegates to fileServiceAdapter.copyDocument with caller-supplied auth/tagset', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();
      const newDoc = mockDocument({ id: 'doc-new' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-new',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        reused: false,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(newDoc);

      const result = await service.copyDocumentToBucket(
        'bucket-dst',
        source,
        'user-caller'
      );

      expect(result).toBe(newDoc);
      expect(fileServiceAdapter.copyDocument).toHaveBeenCalledWith({
        sourceId: 'src-doc',
        destinationBucketId: 'bucket-dst',
        authorizationId: 'auth-saved',
        tagsetId: 'tagset-saved',
        createdBy: 'user-caller',
      });
      // Auth + tagset stay attached (fresh row, not reused)
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('composes and saves the destination-inherited policy BEFORE the Go copy insert', async () => {
      const inheritedReadRule = {
        name: 'destination-read',
        grantedPrivileges: [AuthorizationPrivilege.READ],
        criterias: [],
        cascade: true,
      };
      const destinationAuthorization = {
        id: 'bucket-auth',
        credentialRules: [inheritedReadRule],
        privilegeRules: [],
      };
      const bucket = mockStorageBucket({
        id: 'bucket-dst',
        authorization: destinationAuthorization as any,
      });
      const source = makeSourceDoc();
      const copiedDocument = mockDocument({
        id: 'doc-new',
        createdBy: 'user-caller',
        authorization: {
          id: 'doc-auth',
          type: AuthorizationPolicyType.DOCUMENT,
          credentialRules: [],
          privilegeRules: [],
        } as any,
        tagset: {
          id: 'tagset-saved',
          name: 'default',
          tags: [],
          authorization: {
            id: 'tagset-auth',
            credentialRules: [],
            privilegeRules: [],
          },
        } as any,
      });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-new',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        reused: false,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        copiedDocument
      );
      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockImplementation((child: any, parent: any) => ({
        ...child,
        credentialRules: [...(parent?.credentialRules ?? [])],
        privilegeRules: [...(parent?.privilegeRules ?? [])],
      }));
      (
        authorizationPolicyService.createCredentialRule as Mock
      ).mockImplementation((grantedPrivileges, criterias, name) => ({
        name,
        grantedPrivileges,
        criterias,
        cascade: true,
      }));
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockImplementation((authorization: any, rules: any[]) => ({
        ...authorization,
        credentialRules: [...authorization.credentialRules, ...rules],
      }));
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      const realDocumentAuthorizationService = new DocumentAuthorizationService(
        authorizationPolicyService
      );
      (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockImplementation(
        realDocumentAuthorizationService.applyAuthorizationPolicy.bind(
          realDocumentAuthorizationService
        )
      );

      const result = await service.copyDocumentToBucket(
        'bucket-dst',
        source,
        'user-caller'
      );

      // ORDERING IS THE POINT: the row must be authorized the instant it
      // exists, so composition happens against the pre-created policy BEFORE
      // fileServiceAdapter.copyDocument inserts anything.
      const composeOrder = (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mock.invocationCallOrder[0];
      const insertOrder = (fileServiceAdapter.copyDocument as Mock).mock
        .invocationCallOrder[0];
      expect(composeOrder).toBeLessThan(insertOrder);

      // Composed against the destination bucket's policy, with the creator
      // rule appended (bucket-dst is not a CONVERSATION aggregator), and
      // carrying the caller as createdBy.
      const [composedDoc, parentAuth, appendCreatorRule] = (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mock.calls[0];
      expect(parentAuth).toBe(destinationAuthorization);
      expect(appendCreatorRule).toBe(true);
      expect(composedDoc.createdBy).toBe('user-caller');
      expect(composedDoc.authorization.credentialRules).toEqual([
        inheritedReadRule,
        expect.objectContaining({
          grantedPrivileges: [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
          ],
          criterias: [expect.objectContaining({ resourceID: 'user-caller' })],
        }),
      ]);
      expect(result.id).toBe(copiedDocument.id);
    });

    it('forwards externalReference and displayName to the Go copy without disturbing positional callers', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();
      const copied = mockDocument({ id: 'doc-new' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-new',
        externalID: 'ext',
        mimeType: MimeTypeVisual.PNG,
        size: 10,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(copied);

      await service.copyDocumentToBucket(
        'bucket-dst',
        source,
        'user-caller',
        false,
        {
          externalReference: 'KnJLupUceCirVxKYoDGsrbdC',
          displayName: 'holiday.png',
        }
      );

      expect(fileServiceAdapter.copyDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          externalReference: 'KnJLupUceCirVxKYoDGsrbdC',
          displayName: 'holiday.png',
        })
      );

      // Omitting the options object leaves both fields undefined, so existing
      // positional callers keep their present request shape.
      (fileServiceAdapter.copyDocument as Mock).mockClear();
      await service.copyDocumentToBucket('bucket-dst', source, 'user-caller');
      const [sentWithoutOptions] = (fileServiceAdapter.copyDocument as Mock)
        .mock.calls[0];
      expect(sentWithoutOptions.externalReference).toBeUndefined();
      expect(sentWithoutOptions.displayName).toBeUndefined();
    });

    it('PRESERVES auth + tagset when the Go copy call itself REJECTS, since it may have committed first', async () => {
      // The decisive case: goCall was invoked and threw. A lost response is
      // indistinguishable from a failed insert, so a row may exist referencing
      // the pre-created policy/tagset. Freeing them would strand it.
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-lost-response',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-lost-response',
        authorization: { id: 'tagset-lost-response-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockRejectedValue(
        new Error('socket hang up')
      );

      await expect(
        service.copyDocumentToBucket('bucket-dst', source, 'user-caller')
      ).rejects.toThrow('socket hang up');

      expect(fileServiceAdapter.copyDocument).toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('DOES release auth + tagset when the failure happens BEFORE the Go call is invoked', async () => {
      // Nothing can reference them if the call never started, so the
      // pre-invocation cleanup is kept rather than leaking on every such error.
      const bucket = mockStorageBucket({
        id: 'bucket-dst',
        authorization: { id: 'dst-auth', credentialRules: [] } as any,
      });
      const source = makeSourceDoc();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-pre',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-pre',
        authorization: { id: 'tagset-pre-auth' },
      });
      // Composition runs before the Go call; fail it there.
      (
        documentAuthorizationService.applyAuthorizationPolicy as Mock
      ).mockRejectedValue(new Error('composition failed'));

      await expect(
        service.copyDocumentToBucket('bucket-dst', source, 'user-caller')
      ).rejects.toThrow('composition failed');

      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith({
        id: 'auth-pre',
      });
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-pre');
    });

    it('PRESERVES a possibly-committed Go row, its policy and tagset when a post-copy step fails', async () => {
      // The copy call SUCCEEDED; only the reload failed. Whether the row is
      // committed is unknown from here, and it may already be referenced, so
      // deleting it — or freeing the policy/tagset it points at — destroys
      // data on a suspicion.
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-uncertain',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-uncertain',
        authorization: { id: 'tagset-uncertain-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-maybe-committed',
        externalID: 'ext',
        mimeType: MimeTypeVisual.PNG,
        size: 10,
      });
      (documentService.getDocumentOrFail as Mock).mockRejectedValue(
        new Error('reload failed')
      );

      await expect(
        service.copyDocumentToBucket('bucket-dst', source, 'user-caller')
      ).rejects.toThrow('reload failed');

      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
    });

    it('releases pre-created auth + tagset when Go responds reused:true', async () => {
      // Same dedup-reuse contract as createDocument: when Go returns an
      // existing row, our pre-created auth/tagset are orphans and must be
      // released so they don't accumulate in the DB.
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();
      const reusedDoc = mockDocument({ id: 'doc-existing' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-existing',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        reused: true,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(reusedDoc);

      await service.copyDocumentToBucket('bucket-dst', source);

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith({
        id: 'auth-saved',
      });
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-saved');
      // Existing doc must NOT be deleted on reuse — it belongs to another caller.
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('PRESERVES pre-created resources when the copy call rejects after invocation', async () => {
      // Full compensation when Go's copy call throws: delete the auth and
      // tagset rows we pre-created. No Go-side document was created here so
      // there's nothing to delete on that side.
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockRejectedValue(
        new Error('copy failed')
      );

      await expect(
        service.copyDocumentToBucket('bucket-dst', source)
      ).rejects.toThrow('copy failed');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('falls back to source.createdBy when no userID is supplied', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc({ createdBy: 'orig-user' });
      const newDoc = mockDocument({ id: 'doc-new' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-new',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        reused: false,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(newDoc);

      await service.copyDocumentToBucket('bucket-dst', source);

      expect(fileServiceAdapter.copyDocument).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'orig-user' })
      );
    });

    it('forwards skipDedup=true to fileServiceAdapter.copyDocument', async () => {
      // Pin the contract relied upon by profile-documents.service.ts: when the
      // caller asks for a guaranteed-fresh row (skipDedup=true), the flag is
      // propagated through to the adapter rather than dropped.
      const bucket = mockStorageBucket({ id: 'bucket-dst' });
      const source = makeSourceDoc();
      const newDoc = mockDocument({ id: 'doc-new' });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.copyDocument as Mock).mockResolvedValue({
        id: 'doc-new',
        externalID: 'ext-shared',
        mimeType: MimeTypeVisual.PNG,
        size: 1234,
        reused: false,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(newDoc);

      await service.copyDocumentToBucket('bucket-dst', source, 'user-1', true);

      expect(fileServiceAdapter.copyDocument).toHaveBeenCalledWith(
        expect.objectContaining({ skipDedup: true })
      );
    });
  });

  // ── uploadFileAsDocument (stream) ──────────────────────────────

  describe('uploadFileAsDocument', () => {
    const makeReadable = (data: Buffer): Readable => Readable.from(data);

    beforeEach(() => {
      // Provide a usable stream timeout so streamToBuffer doesn't fire
      // immediately in the mocked ConfigService environment. configService
      // here is the same instance DI injected into the service under test.
      (configService.get as Mock).mockReturnValue(5000);
    });

    it.each([
      ['empty filename', ''],
      ['whitespace-only filename', '   '],
    ])('substitutes _unspecified_ when %s is supplied', async (_label, filename) => {
      const bucket = mockStorageBucket({ id: 'bucket-unnamed' });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocumentFromStream as Mock).mockResolvedValue({
        id: 'doc-unnamed',
        externalID: 'ext-unnamed',
        mimeType: MimeTypeVisual.PNG,
        size: 3,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        mockDocument()
      );

      await service.uploadFileAsDocument(
        'bucket-unnamed',
        makeReadable(Buffer.from('png')),
        filename,
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(fileServiceAdapter.createDocumentFromStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          displayName: '_unspecified_',
          storageBucketId: 'bucket-unnamed',
        }),
        expect.any(Number)
      );
    });

    it('passes the real filename through when supplied', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-named' });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocumentFromStream as Mock).mockResolvedValue({
        id: 'doc-named',
        externalID: 'ext-named',
        mimeType: MimeTypeVisual.PNG,
        size: 3,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        mockDocument()
      );

      await service.uploadFileAsDocument(
        'bucket-named',
        makeReadable(Buffer.from('png')),
        'diagram.png',
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(fileServiceAdapter.createDocumentFromStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ displayName: 'diagram.png' }),
        expect.any(Number)
      );
    });

    // A conversation attachment is durable and pre-authorized: the caller's
    // temporary flag is overridden, and the FULL policy is composed before the
    // row exists, so it is never momentarily unauthorized.
    describe('CONVERSATION buckets', () => {
      const arrangeConversationUpload = (): IStorageBucket => {
        const bucket = mockStorageBucket({
          id: 'bucket-conversation',
          authorization: { id: 'bucket-auth' } as any,
          storageAggregator: {
            id: 'agg-conversation',
            type: StorageAggregatorType.CONVERSATION,
          } as any,
        });
        (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
          bucket
        );
        (authorizationPolicyService.save as Mock).mockResolvedValue({
          id: 'auth-saved',
        });
        (tagsetService.save as Mock).mockResolvedValue({
          id: 'tagset-saved',
          authorization: { id: 'tagset-saved-auth' },
        });
        (fileServiceAdapter.createDocumentFromStream as Mock).mockResolvedValue(
          {
            id: 'doc-conv',
            externalID: 'ext-conv',
            mimeType: MimeTypeVisual.PNG,
            size: 3,
          }
        );
        (documentService.getDocumentOrFail as Mock).mockResolvedValue(
          mockDocument()
        );
        return bucket;
      };

      it('stores DURABLY even when the caller asked for a temporary location', async () => {
        arrangeConversationUpload();

        await service.uploadFileAsDocument(
          'bucket-conversation',
          makeReadable(Buffer.from('png')),
          'holiday.png',
          MimeTypeVisual.PNG,
          'bob',
          true // the generic upload mutation's temporaryLocation flag
        );

        expect(
          fileServiceAdapter.createDocumentFromStream
        ).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            temporaryLocation: false,
            // Durable, so it dedups like any other durable upload.
            skipDedup: undefined,
          }),
          expect.any(Number)
        );
      });

      it('composes the full policy BEFORE the row is created, without the creator rule', async () => {
        const bucket = arrangeConversationUpload();

        await service.uploadFileAsDocument(
          'bucket-conversation',
          makeReadable(Buffer.from('png')),
          'holiday.png',
          MimeTypeVisual.PNG,
          'bob'
        );

        const apply =
          documentAuthorizationService.applyAuthorizationPolicy as Mock;
        expect(apply).toHaveBeenCalledWith(
          expect.objectContaining({
            authorization: { id: 'auth-saved' },
            createdBy: 'bob',
            tagset: expect.objectContaining({ id: 'tagset-saved' }),
          }),
          bucket.authorization,
          // Conversation membership alone grants access; a creator rule would
          // survive the uploader leaving the conversation.
          false
        );
        // The ordering IS the property: a row that exists before its policy
        // does is readable by whoever the parent policy has yet to exclude.
        expect(apply.mock.invocationCallOrder[0]).toBeLessThan(
          (fileServiceAdapter.createDocumentFromStream as Mock).mock
            .invocationCallOrder[0]
        );
      });
    });

    it('leaves a NON-conversation upload to the resolver, honouring the requested temporary location', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-generic',
        authorization: { id: 'bucket-auth' } as any,
        storageAggregator: { type: StorageAggregatorType.USER } as any,
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({
        id: 'tagset-saved',
        authorization: { id: 'tagset-saved-auth' },
      });
      (fileServiceAdapter.createDocumentFromStream as Mock).mockResolvedValue({
        id: 'doc-generic',
        externalID: 'ext-generic',
        mimeType: MimeTypeVisual.PNG,
        size: 3,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        mockDocument()
      );

      await service.uploadFileAsDocument(
        'bucket-generic',
        makeReadable(Buffer.from('png')),
        'diagram.png',
        MimeTypeVisual.PNG,
        'user-1',
        true
      );

      expect(fileServiceAdapter.createDocumentFromStream).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ temporaryLocation: true, skipDedup: true }),
        expect.any(Number)
      );
      expect(
        documentAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('destroys the source when it fails BEFORE the adapter can consume it', async () => {
      // Validation rejects ahead of the transfer; nothing else will ever read
      // this stream, so leaving it open leaks the upload's file handle.
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
        mockStorageBucket({
          id: 'bucket-restricted',
          allowedMimeTypes: [MimeTypeVisual.PNG],
        })
      );
      const source = makeReadable(Buffer.from('%PDF'));

      await expect(
        service.uploadFileAsDocument(
          'bucket-restricted',
          source,
          'contract.pdf',
          MimeTypeDocument.PDF,
          'user-1'
        )
      ).rejects.toThrow();

      expect(source.destroyed).toBe(true);
      expect(
        fileServiceAdapter.createDocumentFromStream
      ).not.toHaveBeenCalled();
    });
  });

  // ── getFilteredDocuments ────────────────────────────────────────

  describe('getFilteredDocuments', () => {
    const actorContext = new ActorContext();

    beforeEach(() => {
      // Default: grant READ access to all documents
      (authorizationService.isAccessGranted as Mock).mockReturnValue(true);
    });

    it('should return all readable documents when no IDs or limit specified', async () => {
      const doc1 = mockDocument({ id: 'doc-1' });
      const doc2 = mockDocument({ id: 'doc-2' });
      const bucket = mockStorageBucket({
        id: 'bucket-filter',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([doc1, doc2]);
    });

    it('omits policy-less internal files before authorizing user-facing documents', async () => {
      const internalSnapshot = mockDocument({
        id: 'snapshot-1',
        authorization: undefined,
        tagset: undefined,
      });
      const document = mockDocument({ id: 'document-1' });
      const bucket = mockStorageBucket({
        id: 'bucket-mixed',
        documents: [internalSnapshot, document],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_actorContext, authorization) => {
          if (!authorization) {
            throw new Error('authorization must not run for internal files');
          }
          return true;
        }
      );

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([document]);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledTimes(1);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        document.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('returns an empty collection when a bucket contains only policy-less internal files', async () => {
      const internalSnapshot = mockDocument({
        id: 'snapshot-only',
        authorization: undefined,
        tagset: undefined,
      });
      const bucket = mockStorageBucket({
        id: 'bucket-internal-only',
        documents: [internalSnapshot],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([]);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('fails an ID lookup for a policy-less internal file without authorizing it', async () => {
      const internalSnapshot = mockDocument({
        id: 'snapshot-by-id',
        authorization: undefined,
        tagset: undefined,
      });
      const bucket = mockStorageBucket({
        id: 'bucket-internal-id',
        documents: [internalSnapshot],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.getFilteredDocuments(
          bucket,
          { IDs: [internalSnapshot.id] },
          actorContext
        )
      ).rejects.toThrow(EntityNotFoundException);
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });

    it('should filter out documents the agent does not have READ access to', async () => {
      const doc1 = mockDocument({ id: 'readable-doc' });
      const doc2 = mockDocument({ id: 'unreadable-doc' });
      const bucket = mockStorageBucket({
        id: 'bucket-auth',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_agent: any, auth: any, _priv: any) => {
          // Only doc1 is readable
          return auth === doc1.authorization;
        }
      );

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([doc1]);
    });

    it('should return documents in order of requested IDs when IDs filter is specified', async () => {
      const doc1 = mockDocument({ id: 'doc-a' });
      const doc2 = mockDocument({ id: 'doc-b' });
      const doc3 = mockDocument({ id: 'doc-c' });
      const bucket = mockStorageBucket({
        id: 'bucket-ids',
        documents: [doc1, doc2, doc3],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        { IDs: ['doc-c', 'doc-a'] },
        actorContext
      );

      expect(result).toEqual([doc3, doc1]);
    });

    it('should throw EntityNotFoundException when requested ID is not in the bucket', async () => {
      const doc1 = mockDocument({ id: 'doc-exists' });
      const bucket = mockStorageBucket({
        id: 'bucket-missing',
        documents: [doc1],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.getFilteredDocuments(
          bucket,
          { IDs: ['doc-not-here'] },
          actorContext
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should limit the number of returned documents when limit is specified', async () => {
      const docs = Array.from({ length: 5 }, (_, i) =>
        mockDocument({ id: `doc-${i}` })
      );
      const bucket = mockStorageBucket({
        id: 'bucket-limit',
        documents: docs,
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        { limit: 2 },
        actorContext
      );

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when storage has no documents array', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-no-docs',
      });
      // Override documents to undefined to simulate uninitialized state
      (bucket as any).documents = undefined;
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.getFilteredDocuments(bucket, {}, actorContext)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── addDocumentToStorageBucketOrFail ────────────────────────────

  describe('addDocumentToStorageBucketOrFail', () => {
    it('should add document to bucket and set storageBucket reference when valid', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-add' });
      const doc = mockDocument({ size: 500 });

      const result = await service.addDocumentToStorageBucketOrFail(
        bucket,
        doc
      );

      expect(result.storageBucket).toBe(bucket);
      expect(bucket.documents).toContain(doc);
    });

    it('should not add duplicate document to bucket documents array', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-nodup' });
      const doc = mockDocument({ size: 500 });
      bucket.documents.push(doc);

      await service.addDocumentToStorageBucketOrFail(bucket, doc);

      expect(bucket.documents.filter(d => d === doc)).toHaveLength(1);
    });

    it('should throw ValidationException when document MIME type is not allowed', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-badmime',
        allowedMimeTypes: [MimeTypeVisual.PNG] as MimeFileType[],
      });
      const doc = mockDocument({
        mimeType: MimeTypeDocument.PDF as MimeFileType,
      });

      await expect(
        service.addDocumentToStorageBucketOrFail(bucket, doc)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when document size exceeds bucket max', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-toobig',
        maxFileSize: 100,
      });
      const doc = mockDocument({ size: 200 });

      await expect(
        service.addDocumentToStorageBucketOrFail(bucket, doc)
      ).rejects.toThrow(ValidationException);
    });
  });

  // ── ensureAvatarUrlIsDocument ───────────────────────────────────

  describe('ensureAvatarUrlIsDocument', () => {
    it('should return existing document when URL is an Alkemio document URL', async () => {
      const existingDoc = mockDocument();
      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(true);
      (documentService.getDocumentFromURL as Mock).mockResolvedValue(
        existingDoc
      );

      const result = await service.ensureAvatarUrlIsDocument(
        'https://alkem.io/api/private/rest/storage/document/some-id',
        'bucket-1',
        'user-1'
      );

      expect(result).toBe(existingDoc);
      expect(avatarCreatorService.urlToBuffer).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when Alkemio URL does not resolve to a document', async () => {
      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(true);
      (documentService.getDocumentFromURL as Mock).mockResolvedValue(undefined);

      await expect(
        service.ensureAvatarUrlIsDocument(
          'https://alkem.io/api/private/rest/storage/document/missing',
          'bucket-1'
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should download external avatar, detect file type, upload, and return document when URL is external', async () => {
      const imageBuffer = Buffer.from('image-data');
      const uploadedDoc = mockDocument({ externalID: 'ext-avatar' });
      const bucket = mockStorageBucket({ id: 'bucket-avatar' });

      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(false);
      (avatarCreatorService.urlToBuffer as Mock).mockResolvedValue(imageBuffer);
      (avatarCreatorService.getFileType as Mock).mockResolvedValue(
        MimeTypeVisual.JPEG
      );

      // uploadFileAsDocumentFromBuffer internals (now via fileServiceAdapter)
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-avatar',
        externalID: 'ext-avatar',
        mimeType: MimeTypeVisual.JPEG,
        size: imageBuffer.length,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        uploadedDoc
      );

      const result = await service.ensureAvatarUrlIsDocument(
        'https://external.com/avatar.jpg',
        'bucket-avatar',
        'user-1'
      );

      expect(avatarCreatorService.urlToBuffer).toHaveBeenCalledWith(
        'https://external.com/avatar.jpg'
      );
      expect(avatarCreatorService.getFileType).toHaveBeenCalledWith(
        imageBuffer
      );
      expect(result).toBe(uploadedDoc);
    });

    it('should default to PNG MIME type when file type detection returns falsy', async () => {
      const imageBuffer = Buffer.from('unknown-image');
      const uploadedDoc = mockDocument();
      const bucket = mockStorageBucket({ id: 'bucket-fallback' });

      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(false);
      (avatarCreatorService.urlToBuffer as Mock).mockResolvedValue(imageBuffer);
      (avatarCreatorService.getFileType as Mock).mockResolvedValue(null);

      // uploadFileAsDocumentFromBuffer internals (now via fileServiceAdapter)
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-fallback',
        externalID: 'ext-fallback',
        mimeType: MimeTypeVisual.PNG,
        size: imageBuffer.length,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        uploadedDoc
      );

      await service.ensureAvatarUrlIsDocument(
        'https://external.com/unknown',
        'bucket-fallback'
      );

      // The upload should use PNG as the fallback mime type (passed to fileServiceAdapter)
      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        imageBuffer,
        expect.objectContaining({
          displayName: expect.any(String),
          mimeType: MimeTypeVisual.PNG,
        })
      );
    });
  });

  // ── getStorageBucketParent ──────────────────────────────────────

  describe('getStorageBucketParent', () => {
    it('should return parent profile info when a profile references this bucket', async () => {
      const profile = {
        id: 'profile-1',
        type: 'user',
        displayName: 'John Doe',
      };
      const bucket = mockStorageBucket({ id: 'bucket-parent' });
      (profileRepository.findOne as Mock).mockResolvedValue(profile);
      (urlGeneratorService.generateUrlForProfile as Mock).mockResolvedValue(
        '/users/john-doe'
      );

      const result = await service.getStorageBucketParent(bucket);

      expect(result).toEqual({
        id: 'profile-1',
        type: 'user',
        displayName: 'John Doe',
        url: '/users/john-doe',
      });
    });

    it('should return null when no profile references this bucket', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-orphan' });
      (profileRepository.findOne as Mock).mockResolvedValue(null);

      const result = await service.getStorageBucketParent(bucket);

      expect(result).toBeNull();
    });
  });

  // ── getDocuments ────────────────────────────────────────────────

  describe('getDocuments', () => {
    it('should return documents from storage bucket when they exist', async () => {
      const doc1 = mockDocument({ id: 'doc-g1' });
      const doc2 = mockDocument({ id: 'doc-g2' });
      const bucket = mockStorageBucket({
        id: 'bucket-docs',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getDocuments(bucket);

      expect(result).toEqual([doc1, doc2]);
    });

    it('should throw EntityNotFoundException when documents are undefined', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-nodocs' });
      const loadedBucket = { ...bucket, documents: undefined };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
        loadedBucket
      );

      await expect(service.getDocuments(bucket)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
