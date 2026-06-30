import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { Conversation } from '../conversation/conversation.entity';
import { Room } from '../room/room.entity';
import { MessageAttachmentService } from './message.attachment.service';

const MATRIX_MEDIA_BUCKET = 'matrix-media-bucket';
const CONV_BUCKET = 'conv-bucket';
const CALLOUT_BUCKET = 'callout-bucket';

const mockConfig = {
  get: vi.fn((key: string) => {
    if (key === 'communications.message_attachments.enabled') return true;
    if (key === 'storage.file_service.matrix_media_bucket_id')
      return MATRIX_MEDIA_BUCKET;
    return undefined;
  }),
};

const conversationRoom: IRoom = {
  id: 'room-1',
  type: RoomType.CONVERSATION_GROUP,
} as IRoom;

const calloutRoom: IRoom = {
  id: 'callout-room-1',
  type: RoomType.CALLOUT,
} as IRoom;

const conversationBucket = {
  id: CONV_BUCKET,
  allowedMimeTypes: ['image/png'],
  maxFileSize: 52428800,
  authorization: { id: 'conv-bucket-auth' },
};

describe('MessageAttachmentService', () => {
  let service: MessageAttachmentService;
  let fileServiceAdapter: Mocked<FileServiceAdapter>;
  let documentService: Mocked<DocumentService>;
  let storageBucketService: Mocked<StorageBucketService>;
  let authorizationService: Mocked<AuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let storageAggregatorResolverService: Mocked<StorageAggregatorResolverService>;
  let conversationRepository: {
    findOne: ReturnType<typeof vi.fn>;
    manager: { findOne: ReturnType<typeof vi.fn> };
  };
  let roomRepository: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    conversationRepository = {
      findOne: vi.fn(),
      manager: { findOne: vi.fn() },
    };
    roomRepository = { findOne: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentService,
        MockWinstonProvider,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: roomRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MessageAttachmentService);
    fileServiceAdapter = module.get(FileServiceAdapter);
    documentService = module.get(DocumentService);
    storageBucketService = module.get(StorageBucketService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );

    conversationRepository.findOne.mockResolvedValue({
      id: 'conv-1',
      storageAggregator: { directStorage: { id: CONV_BUCKET } },
    });
    storageBucketService.getStorageBucketOrFail.mockResolvedValue(
      conversationBucket as any
    );
    authorizationPolicyService.inheritParentAuthorization.mockReturnValue({
      id: 'minted',
    } as any);
    authorizationPolicyService.save.mockResolvedValue({
      id: 'minted-auth',
    } as any);
  });

  it('is enabled when the flag is on', () => {
    expect(service.isEnabled()).toBe(true);
  });

  // --- T009 outbound validation ---

  describe('resolveOutboundAttachments', () => {
    it('returns [] when there are no attachments', async () => {
      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        {} as any,
        undefined
      );
      expect(refs).toEqual([]);
    });

    it('rejects more than 10 attachments', async () => {
      const ids = Array.from({ length: 11 }, (_, i) => `doc-${i}`);
      await expect(
        service.resolveOutboundAttachments(conversationRoom, {} as any, ids)
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('rejects a document that is not in the conversation bucket', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        storageBucket: { id: 'some-other-bucket' },
        authorization: { id: 'a' },
      } as any);

      await expect(
        service.resolveOutboundAttachments(conversationRoom, {} as any, [
          'doc-1',
        ])
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('resolves valid attachments, READ-gates, and persists temporaryLocation off', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        imageWidth: 10,
        imageHeight: 20,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        {} as any,
        ['doc-1']
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
      expect(refs).toEqual([
        {
          documentId: 'doc-1',
          displayName: 'pic.png',
          mimeType: 'image/png',
          size: 1000,
          width: 10,
          height: 20,
        },
      ]);
    });
  });

  // --- T013 inbound re-home ---

  describe('rehomeInboundAttachments', () => {
    it('MOVES a staging document into the conversation bucket', async () => {
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null) // not already in target
        .mockResolvedValueOnce({
          id: 'doc-staging',
          storageBucketId: MATRIX_MEDIA_BUCKET,
          mimeType: 'image/png',
        } as any); // global canonical lookup

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          media_id: 'media-1',
          display_name: 'x',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-staging',
        expect.objectContaining({
          storageBucketId: CONV_BUCKET,
          createdBy: 'sender-1',
          externalReference: 'media-1',
        })
      );
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });

    it('COPIES (re-share) when the media is already homed elsewhere', async () => {
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-other',
          storageBucketId: 'another-conversation-bucket',
          mimeType: 'image/png',
        } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          media_id: 'media-1',
          display_name: 'x',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(fileServiceAdapter.copyDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'doc-other',
          destinationBucketId: CONV_BUCKET,
          externalReference: 'media-1',
        })
      );
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('is idempotent: does nothing when the document is already in the target bucket', async () => {
      fileServiceAdapter.getDocumentByReference.mockResolvedValueOnce({
        id: 'doc-existing',
        storageBucketId: CONV_BUCKET,
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          media_id: 'media-1',
          display_name: 'x',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });

    it('HEIC: MOVES verbatim like any other type — single mint, no second doc', async () => {
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-heic',
          displayName: 'photo.heic',
          storageBucketId: MATRIX_MEDIA_BUCKET,
          mimeType: 'image/heic',
        } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          media_id: 'media-heic',
          display_name: 'photo.heic',
          mime_type: 'image/heic',
          size: 1,
        },
      ]);

      // Uniform re-home: a single verbatim MOVE, a single auth mint, and no
      // second transcoded conversation doc (serve-time transcode lives in
      // file-service now).
      expect(authorizationPolicyService.save).toHaveBeenCalledTimes(1);
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-heic',
        expect.objectContaining({
          storageBucketId: CONV_BUCKET,
          createdBy: 'sender-1',
          externalReference: 'media-heic',
        })
      );
      expect(fileServiceAdapter.createDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
    });

    it('comment-room (callout): re-homes into the parent callout bucket', async () => {
      conversationRepository.manager.findOne.mockResolvedValue({
        id: 'callout-1',
      });
      storageAggregatorResolverService.getStorageAggregatorForCallout.mockResolvedValue(
        { id: 'agg-1' } as any
      );
      storageAggregatorResolverService.getStorageAggregatorOrFail.mockResolvedValue(
        {
          id: 'agg-1',
          directStorage: { id: CALLOUT_BUCKET, authorization: { id: 'cb-a' } },
        } as any
      );
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-staging',
          storageBucketId: MATRIX_MEDIA_BUCKET,
          mimeType: 'image/png',
        } as any);

      const bucketId = await service.rehomeInboundAttachments(
        calloutRoom,
        'sender-1',
        [
          {
            media_id: 'media-c',
            display_name: 'x',
            mime_type: 'image/png',
            size: 1,
          },
        ]
      );

      expect(bucketId).toBe(CALLOUT_BUCKET);
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-staging',
        expect.objectContaining({ storageBucketId: CALLOUT_BUCKET })
      );
    });
  });

  // --- outbound coalesce (eliminate the stranded matrix_media twin) ---

  describe('rehomeInboundAttachments — outbound coalesce', () => {
    const outboundEcho = {
      document_id: 'doc-D',
      media_id: 'media-Y',
      display_name: 'pic.png',
      mime_type: 'image/png',
      size: 1,
    };

    it('stamps externalReference on D and deletes the matrix_media staging twin', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        externalID: undefined,
        storageBucket: { id: CONV_BUCKET },
      } as any);
      fileServiceAdapter.getDocumentByReference.mockResolvedValue({
        id: 'doc-twin',
        storageBucketId: MATRIX_MEDIA_BUCKET,
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      // (1) D stamped with the Synapse media id.
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-D', {
        externalReference: 'media-Y',
      });
      // (2) twin looked up scoped to matrix_media, then deleted.
      expect(fileServiceAdapter.getDocumentByReference).toHaveBeenCalledWith(
        'media-Y',
        MATRIX_MEDIA_BUCKET
      );
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'doc-twin'
      );
      // No re-home of the echo.
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });

    it('is idempotent: D already stamped and twin already gone → no-op', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        externalID: 'media-Y', // already coalesced on a previous delivery
        storageBucket: { id: CONV_BUCKET },
      } as any);
      fileServiceAdapter.getDocumentByReference.mockResolvedValue(null);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('confused-deputy guard: ignores an echo whose document_id is not in the room bucket', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        externalID: undefined,
        storageBucket: { id: 'a-foreign-bucket' },
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('no-op when the echo carries no media_id (twin not locatable yet)', async () => {
      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          document_id: 'doc-D',
          display_name: 'pic.png',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // --- T013 read resolution ---

  describe('resolveMessageAttachments', () => {
    it('resolves an outbound (document_id) attachment and READ-gates it', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-1'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            {
              document_id: 'doc-1',
              display_name: 'pic.png',
              mime_type: 'image/png',
              size: 1000,
            },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([
        expect.objectContaining({ id: 'doc-1', url: 'https://docs/doc-1' }),
      ]);
    });

    it('M5: ignores an outbound document_id that does not belong to the message bucket', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-evil',
        storageBucket: { id: 'a-foreign-bucket' },
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-evil', mime_type: 'image/png', size: 1 },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([]);
    });

    it('H1: resolves an inbound (media_id) attachment on a history read via roomID fallback', async () => {
      // No storageBucketId on the message (history read path); roomID present.
      roomRepository.findOne.mockResolvedValue({
        id: 'room-1',
        type: RoomType.CONVERSATION_GROUP,
      });
      fileServiceAdapter.getDocumentByReference.mockResolvedValue({
        id: 'doc-rehomed',
      } as any);
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-rehomed'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          roomID: 'room-1',
          rawAttachments: [
            {
              media_id: 'media-1',
              display_name: 'x',
              mime_type: 'image/png',
              size: 1,
            },
          ],
        } as any,
        {} as any
      );

      expect(fileServiceAdapter.getDocumentByReference).toHaveBeenCalledWith(
        'media-1',
        CONV_BUCKET
      );
      expect(result).toEqual([expect.objectContaining({ id: 'doc-rehomed' })]);
    });

    it('denies a non-member (READ not granted)', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            {
              document_id: 'doc-1',
              display_name: 'x',
              mime_type: 'image/png',
              size: 1,
            },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([]);
    });
  });
});
