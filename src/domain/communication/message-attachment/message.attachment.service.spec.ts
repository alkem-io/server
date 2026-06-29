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
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { Conversation } from '../conversation/conversation.entity';
import { MessageAttachmentService } from './message.attachment.service';

const MATRIX_MEDIA_BUCKET = 'matrix-media-bucket';
const CONV_BUCKET = 'conv-bucket';

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
  let conversationRepository: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    conversationRepository = { findOne: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentService,
        MockWinstonProvider,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepository,
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
  });

  // --- T013 read resolution ---

  describe('resolveMessageAttachments', () => {
    it('resolves an outbound (document_id) attachment and READ-gates it', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-1'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
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

    it('denies a non-member (READ not granted)', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
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
