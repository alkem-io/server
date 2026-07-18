import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRoom } from '@domain/communication/room/room.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
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
  let roomResolverService: Mocked<RoomResolverService>;
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
    roomResolverService = module.get(RoomResolverService);

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

    it('[0] FR-001: rejects CALLOUT comment-room attachments (outbound is conversation-only) without loading the doc or resolving the collab bucket', async () => {
      // Outbound web-client attachments are conversation-only (FR-001). A CALLOUT
      // comment-room send WITH attachments must be rejected BEFORE the bucket is
      // resolved — so no upload is ever staged into the parent COLLABORATION
      // bucket (where the CONVERSATION-only 24h sweep would never reap it).
      await expect(
        service.resolveOutboundAttachments(
          calloutRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      // Guard fires before any document load or bucket resolution / pin.
      expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('[0] FR-001: rejects POST comment-room attachments (outbound is conversation-only)', async () => {
      const postRoom: IRoom = {
        id: 'post-room-1',
        type: RoomType.POST,
      } as IRoom;
      await expect(
        service.resolveOutboundAttachments(
          postRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      expect(documentService.getDocumentOrFail).not.toHaveBeenCalled();
    });

    it('[0] FR-001: a comment-room message with NO attachments is unaffected (returns [])', async () => {
      // The guard only rejects comment rooms that carry attachments; a plain
      // comment message (no uploads) short-circuits on the empty-list check and
      // is never blocked.
      const refs = await service.resolveOutboundAttachments(
        calloutRoom,
        { actorID: 'sender-1' } as any,
        undefined
      );
      expect(refs).toEqual([]);
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

    it('rejects an attachment not owned by the sender (outbound == read invariant)', async () => {
      // FIX 3: a member may only attach their OWN uploads. A doc in the bucket
      // but owned by another member must be rejected before send.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'another-member',
        mimeType: 'image/png',
        size: 1000,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);

      await expect(
        service.resolveOutboundAttachments(
          conversationRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      // Nothing pinned when validation rejects.
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('rejects a durable (already-sent) attachment — single-use invariant (FIX 1)', async () => {
      // A durable doc (temporaryLocation !== true) was already consumed by a
      // prior send; re-attaching it would let one document back two messages, so
      // deleting one would destroy the other's only file row. Reject it.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        mimeType: 'image/png',
        size: 1000,
        temporaryLocation: false,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);

      await expect(
        service.resolveOutboundAttachments(
          conversationRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('resolves + validates a sender-owned attachment, READ-gates, and does NOT pin during resolve', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        // imageWidth/imageHeight are TRANSIENT, file-service-owned fields — a DB
        // load leaves them undefined on the entity, so the ref must source dims
        // from the by-id meta endpoint, NOT from the document.
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      fileServiceAdapter.getDocumentMeta.mockResolvedValue({
        id: 'doc-1',
        imageWidth: 10,
        imageHeight: 20,
      } as any);

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        { actorID: 'sender-1' } as any,
        ['doc-1']
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      // FIX 0: pinning (temporaryLocation=false) is DEFERRED to
      // persistOutboundAttachments (called only after the send succeeds), so
      // resolve itself must not flip anything.
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      // Dims are sourced from the file-service by-id meta endpoint.
      expect(fileServiceAdapter.getDocumentMeta).toHaveBeenCalledWith('doc-1');
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

    it('outbound image: a getDocumentMeta failure leaves width/height undefined and does NOT fail the send ([4])', async () => {
      // Meta sourcing is best-effort: a rejected/failed meta fetch must degrade
      // to undefined dims, never propagate out of resolveOutboundAttachments.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      fileServiceAdapter.getDocumentMeta.mockRejectedValue(
        new Error('file-service down')
      );

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        { actorID: 'sender-1' } as any,
        ['doc-1']
      );

      expect(fileServiceAdapter.getDocumentMeta).toHaveBeenCalledWith('doc-1');
      expect(refs).toEqual([
        {
          documentId: 'doc-1',
          displayName: 'pic.png',
          mimeType: 'image/png',
          size: 1000,
          width: undefined,
          height: undefined,
        },
      ]);
    });

    it('non-image attachment: getDocumentMeta is NOT called (no wasted round-trip) and the ref carries no dims ([4])', async () => {
      // The image-guard skips the extra meta round-trip for non-image files.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-pdf',
        createdBy: 'sender-1',
        displayName: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        { actorID: 'sender-1' } as any,
        ['doc-pdf']
      );

      expect(fileServiceAdapter.getDocumentMeta).not.toHaveBeenCalled();
      expect(refs).toEqual([
        {
          documentId: 'doc-pdf',
          displayName: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          width: undefined,
          height: undefined,
        },
      ]);
    });

    it('fetches image dims in PARALLEL, matches each to its ref, and preserves ref order ([0])', async () => {
      // Multiple images: the dims fetches must run concurrently (worst-case ONE
      // short timeout, not N) yet each ref keeps its OWN dims and the returned
      // refs keep their original input order.
      const docs: Record<string, any> = {
        'img-a': {
          id: 'img-a',
          createdBy: 'sender-1',
          displayName: 'a.png',
          mimeType: 'image/png',
          size: 1,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-a' },
        },
        'img-b': {
          id: 'img-b',
          createdBy: 'sender-1',
          displayName: 'b.png',
          mimeType: 'image/png',
          size: 2,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-b' },
        },
        'img-c': {
          id: 'img-c',
          createdBy: 'sender-1',
          displayName: 'c.png',
          mimeType: 'image/png',
          size: 3,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-c' },
        },
      };
      documentService.getDocumentOrFail.mockImplementation((id: string) =>
        Promise.resolve(docs[id])
      );

      const dims: Record<string, any> = {
        'img-a': { imageWidth: 100, imageHeight: 10 },
        'img-b': { imageWidth: 200, imageHeight: 20 },
        'img-c': { imageWidth: 300, imageHeight: 30 },
      };
      // Track concurrency: all fetches must be in flight simultaneously.
      let inFlight = 0;
      let maxInFlight = 0;
      fileServiceAdapter.getDocumentMeta.mockImplementation(
        async (id: string) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          return dims[id];
        }
      );

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        { actorID: 'sender-1' } as any,
        ['img-a', 'img-b', 'img-c']
      );

      // Order preserved, each ref carrying its OWN dims.
      expect(refs).toEqual([
        {
          documentId: 'img-a',
          displayName: 'a.png',
          mimeType: 'image/png',
          size: 1,
          width: 100,
          height: 10,
        },
        {
          documentId: 'img-b',
          displayName: 'b.png',
          mimeType: 'image/png',
          size: 2,
          width: 200,
          height: 20,
        },
        {
          documentId: 'img-c',
          displayName: 'c.png',
          mimeType: 'image/png',
          size: 3,
          width: 300,
          height: 30,
        },
      ]);
      // Proven parallel: all three meta fetches overlapped in flight.
      expect(maxInFlight).toBe(3);
    });

    it('[1] loads the attachment documents in PARALLEL, then validates in order (refs keep input order)', async () => {
      // The per-id getDocumentOrFail loads are independent I/O and must be issued
      // concurrently (worst-case ~1 round-trip, not N) BEFORE the CPU-only
      // validation pass. Track concurrency of the loads and assert the returned
      // refs keep documentIds order. Non-image docs so getDocumentMeta stays out
      // of the way — this isolates the load-concurrency assertion.
      const docs: Record<string, any> = {
        'doc-x': {
          id: 'doc-x',
          createdBy: 'sender-1',
          displayName: 'x.pdf',
          mimeType: 'application/pdf',
          size: 1,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-x' },
        },
        'doc-y': {
          id: 'doc-y',
          createdBy: 'sender-1',
          displayName: 'y.pdf',
          mimeType: 'application/pdf',
          size: 2,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-y' },
        },
        'doc-z': {
          id: 'doc-z',
          createdBy: 'sender-1',
          displayName: 'z.pdf',
          mimeType: 'application/pdf',
          size: 3,
          temporaryLocation: true,
          storageBucket: { id: CONV_BUCKET },
          authorization: { id: 'auth-z' },
        },
      };
      let inFlight = 0;
      let maxInFlight = 0;
      documentService.getDocumentOrFail.mockImplementation(
        async (id: string) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          return docs[id];
        }
      );

      const refs = await service.resolveOutboundAttachments(
        conversationRoom,
        { actorID: 'sender-1' } as any,
        ['doc-x', 'doc-y', 'doc-z']
      );

      // All three loads overlapped in flight → parallelised, not serialised.
      expect(maxInFlight).toBe(3);
      // Validation still ran (READ-gate) and refs preserve documentIds order.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(3);
      expect(refs.map(r => r.documentId)).toEqual(['doc-x', 'doc-y', 'doc-z']);
    });

    it('[1] restores per-position error precedence: doc[0] WRONG-BUCKET ValidationException surfaces before doc[1] not-found, and loads still overlap', async () => {
      // Regression guard: Promise.all rejected on the FIRST load failure
      // regardless of position, so a LATER doc's not-found could preempt an
      // EARLIER doc's ValidationException. allSettled + an ordered validation
      // pass restores the sequential loop's precedence — position 0's error
      // (here a WRONG-BUCKET ValidationException) surfaces before position 1's
      // not-found — while both loads still run concurrently.
      let inFlight = 0;
      let maxInFlight = 0;
      documentService.getDocumentOrFail.mockImplementation(
        async (id: string) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          if (id === 'doc-missing') {
            // Later position's LOAD failure — must NOT preempt position 0.
            throw new EntityNotFoundException(
              'Document not found',
              LogContext.COMMUNICATION
            );
          }
          // Position 0: owned + staged, but in the WRONG bucket → its VALIDATION
          // must throw first.
          return {
            id: 'doc-wrong-bucket',
            createdBy: 'sender-1',
            mimeType: 'image/png',
            size: 1000,
            temporaryLocation: true,
            storageBucket: { id: 'some-other-bucket' },
            authorization: { id: 'a' },
          } as any;
        }
      );

      const error = await service
        .resolveOutboundAttachments(
          conversationRoom,
          { actorID: 'sender-1' } as any,
          ['doc-wrong-bucket', 'doc-missing']
        )
        .catch(e => e);

      // Position 0's WRONG-BUCKET ValidationException surfaces — NOT doc[1]'s
      // not-found.
      expect(error).toBeInstanceOf(ValidationException);
      expect((error as Error).message).toContain(
        'Attachment does not belong to this conversation'
      );
      // Both loads still overlapped in flight → allSettled kept them concurrent.
      expect(maxInFlight).toBe(2);
    });

    it('[1] a load failure at position 0 surfaces that load error (not masked by later positions)', async () => {
      // When the FIRST position's load fails, its error surfaces at its position
      // (the ordered pass re-throws settled[0].reason) — matching the old
      // sequential loop, which would have thrown on doc-0 before touching doc-1.
      const notFound = new EntityNotFoundException(
        'Document not found',
        LogContext.COMMUNICATION
      );
      documentService.getDocumentOrFail.mockImplementation(
        async (id: string) => {
          if (id === 'doc-0') {
            throw notFound;
          }
          return {
            id,
            createdBy: 'sender-1',
            mimeType: 'image/png',
            size: 1000,
            temporaryLocation: true,
            storageBucket: { id: CONV_BUCKET },
            authorization: { id: 'a' },
          } as any;
        }
      );

      await expect(
        service.resolveOutboundAttachments(
          conversationRoom,
          { actorID: 'sender-1' } as any,
          ['doc-0', 'doc-1']
        )
      ).rejects.toBe(notFound);
    });
  });

  // --- FIX 0: deferred pinning after send ---

  describe('persistOutboundAttachments', () => {
    it('flips temporaryLocation=false for every attachment after a successful send', async () => {
      await service.persistOutboundAttachments([
        {
          documentId: 'doc-1',
          displayName: 'p',
          mimeType: 'image/png',
          size: 1,
        },
        {
          documentId: 'doc-2',
          displayName: 'q',
          mimeType: 'image/png',
          size: 2,
        },
      ] as any);

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-2', {
        temporaryLocation: false,
      });
    });

    it('is a no-op when there are no attachments', async () => {
      await service.persistOutboundAttachments([]);
      await service.persistOutboundAttachments(undefined);
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('is best-effort: a pin failure does not throw into the post-send path', async () => {
      fileServiceAdapter.moveDocument.mockRejectedValueOnce(
        new Error('transient')
      );
      await expect(
        service.persistOutboundAttachments([
          {
            documentId: 'doc-1',
            displayName: 'p',
            mimeType: 'image/png',
            size: 1,
          },
        ] as any)
      ).resolves.toBeUndefined();
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

    it('COPIES (re-share) when the media is already homed elsewhere; the copy is born durable → NO separate pin', async () => {
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'doc-other',
          storageBucketId: 'another-conversation-bucket',
          mimeType: 'image/png',
        } as any);
      fileServiceAdapter.copyDocument.mockResolvedValue({
        id: 'doc-copied',
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
          // Reference-bearing copies must bypass content-dedup so each media_id
          // keeps its own row (and its reference).
          skipDedup: true,
        })
      );
      // The file-service copy is born durable (CopyDocument hardcodes
      // temporaryLocation:false), so the re-share path issues NO follow-up
      // pin/PATCH — moveDocument is never called on the COPY branch.
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
    });

    it('re-share is idempotent: a second receive of the same media_id early-returns without re-copying', async () => {
      // Idempotency: the copy already exists in the target bucket → return early,
      // no re-copy, no canonical lookup, no auth mint, no pin.
      fileServiceAdapter.getDocumentByReference.mockResolvedValueOnce({
        id: 'doc-copied',
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

      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(authorizationPolicyService.save).not.toHaveBeenCalled();
      // Only the single bucket-scoped idempotency lookup ran.
      expect(fileServiceAdapter.getDocumentByReference).toHaveBeenCalledTimes(
        1
      );
    });

    it('never aborts the inbound handler when target bucket resolution throws (FIX 2)', async () => {
      // getTargetBucketForRoom → conversationRepository.findOne throws
      // transiently. The handler must not propagate — inbound message processing
      // continues.
      conversationRepository.findOne.mockRejectedValueOnce(
        new Error('bucket lookup failed')
      );

      await expect(
        service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
          {
            media_id: 'media-1',
            display_name: 'x',
            mime_type: 'image/png',
            size: 1,
          },
        ])
      ).resolves.toBeUndefined();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });

    it('cleans up the minted auth policy when placement (MOVE) fails', async () => {
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null) // not already in target
        .mockResolvedValueOnce({
          id: 'doc-staging',
          storageBucketId: MATRIX_MEDIA_BUCKET,
          mimeType: 'image/png',
        } as any);
      fileServiceAdapter.moveDocument.mockRejectedValueOnce(
        new Error('placement failed')
      );

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          media_id: 'media-1',
          display_name: 'x',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      // The auth minted before placement must not leak when the MOVE fails.
      expect(authorizationPolicyService.deleteById).toHaveBeenCalledWith(
        'minted-auth'
      );
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
      // FIX [2]: parent-callout resolution now delegates to RoomResolverService's
      // canonical getCalloutForRoom instead of a hand-rolled Callout query.
      roomResolverService.getCalloutForRoom.mockResolvedValue({
        id: 'callout-1',
      } as any);
      storageAggregatorResolverService.getStorageAggregatorForCallout.mockResolvedValue(
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
      expect(roomResolverService.getCalloutForRoom).toHaveBeenCalledWith(
        'callout-room-1'
      );
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-staging',
        expect.objectContaining({ storageBucketId: CALLOUT_BUCKET })
      );
    });

    it('comment-room (post): resolves the parent callout via the post helper and re-homes into its bucket', async () => {
      // FIX [2]: post comment rooms resolve their owning callout via
      // RoomResolverService.getCalloutWithPostContributionForRoom; the callout id
      // is extracted from the returned { post, callout, contribution } shape.
      const postRoom: IRoom = {
        id: 'post-room-1',
        type: RoomType.POST,
      } as IRoom;
      roomResolverService.getCalloutWithPostContributionForRoom.mockResolvedValue(
        {
          post: { id: 'post-1' },
          callout: { id: 'callout-1' },
          contribution: { id: 'contrib-1' },
        } as any
      );
      storageAggregatorResolverService.getStorageAggregatorForCallout.mockResolvedValue(
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
        postRoom,
        'sender-1',
        [
          {
            media_id: 'media-p',
            display_name: 'x',
            mime_type: 'image/png',
            size: 1,
          },
        ]
      );

      expect(bucketId).toBe(CALLOUT_BUCKET);
      expect(
        roomResolverService.getCalloutWithPostContributionForRoom
      ).toHaveBeenCalledWith('post-room-1');
      expect(
        storageAggregatorResolverService.getStorageAggregatorForCallout
      ).toHaveBeenCalledWith('callout-1', expect.anything());
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-staging',
        expect.objectContaining({ storageBucketId: CALLOUT_BUCKET })
      );
    });

    it('comment-room: a genuine no-callout (EntityNotFoundException) leaves media in staging (best-effort, no throw)', async () => {
      // The RoomResolverService helpers THROW EntityNotFoundException for a
      // genuine "no callout for this room" miss; resolveParentCalloutId catches
      // ONLY that not-found case and returns undefined, so an unresolvable callout
      // comment room leaves the media in staging instead of aborting inbound
      // processing.
      roomResolverService.getCalloutForRoom.mockRejectedValue(
        new EntityNotFoundException(
          'Unable to identify Callout for Room',
          LogContext.COLLABORATION
        )
      );

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

      expect(bucketId).toBeUndefined();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });

    it('[0] comment-room: a transient DB error from the resolver still degrades gracefully on the INBOUND path (outer wrapper catches it, media stays in staging)', async () => {
      // A NON-not-found error (transient DB/infra) is RE-THROWN by
      // resolveParentCalloutId (not swallowed into undefined). On the inbound
      // re-home path getTargetBucketForRoom is wrapped in its own
      // leave-in-staging try/catch, so the propagated error is still handled here
      // — inbound message processing is never aborted.
      roomResolverService.getCalloutForRoom.mockRejectedValue(
        new Error('db connection reset')
      );

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

      expect(bucketId).toBeUndefined();
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
    });
  });

  // --- FIX [0]: resolveParentCalloutId error narrowing ---

  describe('resolveParentCalloutId (FIX [0]) — narrow not-found catch, propagate DB errors', () => {
    it('callout room: a genuine no-callout (EntityNotFoundException) → returns undefined', async () => {
      roomResolverService.getCalloutForRoom.mockRejectedValue(
        new EntityNotFoundException(
          'Unable to identify Callout for Room',
          LogContext.COLLABORATION
        )
      );

      await expect(
        (service as any).resolveParentCalloutId(calloutRoom)
      ).resolves.toBeUndefined();
    });

    it('callout room: a real DB/infra error (generic Error) PROPAGATES OUT (not swallowed, not converted to undefined)', async () => {
      const dbError = new Error('db connection reset');
      roomResolverService.getCalloutForRoom.mockRejectedValue(dbError);

      await expect(
        (service as any).resolveParentCalloutId(calloutRoom)
      ).rejects.toBe(dbError);
    });

    it('post room: a genuine no-callout (EntityNotFoundException) → returns undefined', async () => {
      const postRoom: IRoom = {
        id: 'post-room-1',
        type: RoomType.POST,
      } as IRoom;
      roomResolverService.getCalloutWithPostContributionForRoom.mockRejectedValue(
        new EntityNotFoundException(
          'Unable to identify Callout with Post contribution for Room',
          LogContext.COLLABORATION
        )
      );

      await expect(
        (service as any).resolveParentCalloutId(postRoom)
      ).resolves.toBeUndefined();
    });

    it('post room: a real DB/infra error (generic Error) PROPAGATES OUT (not swallowed)', async () => {
      const postRoom: IRoom = {
        id: 'post-room-1',
        type: RoomType.POST,
      } as IRoom;
      const dbError = new Error('db pool exhausted');
      roomResolverService.getCalloutWithPostContributionForRoom.mockRejectedValue(
        dbError
      );

      await expect(
        (service as any).resolveParentCalloutId(postRoom)
      ).rejects.toBe(dbError);
    });

    it('[0] FR-001: OUTBOUND attachments on a CALLOUT comment-room are rejected BEFORE the callout resolver runs (conversation-only guard)', async () => {
      // FR-001 scopes outbound (web-client compose) attachments to conversation
      // rooms only. The conversation-only guard now short-circuits a CALLOUT send
      // that carries attachments BEFORE getAttachmentBucketForRoomOrFail →
      // resolveParentCalloutId is ever reached — so the outbound path no longer
      // exercises this resolver at all (it was previously the entry point that
      // masked/propagated its DB errors). No parent-callout resolve happens.
      await expect(
        service.resolveOutboundAttachments(
          calloutRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      expect(roomResolverService.getCalloutForRoom).not.toHaveBeenCalled();
    });

    it('[0] FR-001: OUTBOUND attachments on a POST comment-room are rejected BEFORE the callout resolver runs (conversation-only guard)', async () => {
      const postRoom: IRoom = {
        id: 'post-room-1',
        type: RoomType.POST,
      } as IRoom;

      await expect(
        service.resolveOutboundAttachments(
          postRoom,
          { actorID: 'sender-1' } as any,
          ['doc-1']
        )
      ).rejects.toBeInstanceOf(ValidationException);
      expect(
        roomResolverService.getCalloutWithPostContributionForRoom
      ).not.toHaveBeenCalled();
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

    // Bucket-aware by-reference mock: the coalesce path now does TWO lookups for
    // the same media id — one scoped to the room bucket (idempotency / no-
    // overwrite), one scoped to matrix_media (locate the staging twin).
    const mockByReference = (perBucket: Record<string, any>) => {
      fileServiceAdapter.getDocumentByReference.mockImplementation(
        async (_ref: string, bucketId?: string) =>
          (bucketId ? perBucket[bucketId] : undefined) ?? null
      );
    };

    it('stamps externalReference on D (owned by sender) and deletes the matrix_media staging twin', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        // reference slot free in the conversation bucket → safe to stamp
        [CONV_BUCKET]: null,
        // staging twin present in matrix_media → delete it
        [MATRIX_MEDIA_BUCKET]: {
          id: 'doc-twin',
          storageBucketId: MATRIX_MEDIA_BUCKET,
        },
      });

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

    it('is idempotent: re-delivery finds D already stamped → no second stamp, no overwrite', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        // media id already resolves to D in this bucket (stamped previously)
        [CONV_BUCKET]: { id: 'doc-D', storageBucketId: CONV_BUCKET },
        // twin already swept on the first delivery
        [MATRIX_MEDIA_BUCKET]: null,
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      // The stamp is NEVER re-applied (no overwrite of the existing reference).
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('confused-deputy guard: rejects a forged echo whose document_id is owned by another member — no stamp AND no pin', async () => {
      // Attacker (sender-1) forges an m.image pointing at victim's re-homed doc
      // D + an arbitrary media_id; D IS in the room bucket but is NOT owned by
      // the sender → coalesce must NOT overwrite D's reference, and the
      // delivery-pin (full-gate [0]) must NOT fire either — a forged event can
      // never pin someone else's temporary doc.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'victim-member',
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('no-overwrite guard: skips when media_id already resolves to a different document in the bucket', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        // media id is already bound to a DIFFERENT doc here — never steal it
        [CONV_BUCKET]: { id: 'doc-other', storageBucketId: CONV_BUCKET },
        [MATRIX_MEDIA_BUCKET]: {
          id: 'doc-twin',
          storageBucketId: MATRIX_MEDIA_BUCKET,
        },
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('confused-deputy guard: ignores an echo whose document_id is not in the room bucket', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        storageBucket: { id: 'a-foreign-bucket' },
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('echo without media_id + durable doc → nothing to do (no twin work possible, nothing to pin)', async () => {
      // The guards now run BEFORE the !media_id branch (full-gate [0]), so the
      // doc IS loaded — but a durable doc needs no pin, and without a media_id
      // no twin/stamp work is possible.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        temporaryLocation: false,
        storageBucket: { id: CONV_BUCKET },
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          document_id: 'doc-D',
          display_name: 'pic.png',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.getDocumentByReference).not.toHaveBeenCalled();
    });

    it('full-gate [0]: echo WITHOUT media_id + temporary doc → standalone delivery-pin, no twin/stamp work', async () => {
      // The echo is Synapse's proof of delivery: even when no media_id is
      // surfaced (twin not locatable), the doc must be pinned durable so the
      // 24h sweep cannot reap a delivered attachment.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
      } as any);

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        {
          document_id: 'doc-D',
          display_name: 'pic.png',
          mime_type: 'image/png',
          size: 1,
        },
      ]);

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledTimes(1);
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-D', {
        temporaryLocation: false,
      });
      expect(fileServiceAdapter.getDocumentByReference).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('full-gate [0]: echo WITH media_id + temporary doc → the pin is FOLDED into the stamp (one PATCH)', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        [CONV_BUCKET]: null, // reference slot free → stamp
        [MATRIX_MEDIA_BUCKET]: {
          id: 'doc-twin',
          storageBucketId: MATRIX_MEDIA_BUCKET,
        },
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      // ONE moveDocument carrying BOTH the stamp and the pin.
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledTimes(1);
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-D', {
        externalReference: 'media-Y',
        temporaryLocation: false,
      });
      // Twin cleanup unaffected.
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'doc-twin'
      );
    });

    it('full-gate [0]: already stamped to this doc but STILL temporary → standalone pin issued', async () => {
      // A prior delivery stamped media-Y onto D but the pin never landed (or
      // the pre-fix code never pinned). The re-delivered echo must still heal.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        externalReference: 'media-Y',
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        [CONV_BUCKET]: { id: 'doc-D', storageBucketId: CONV_BUCKET },
        [MATRIX_MEDIA_BUCKET]: null, // twin already swept
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledTimes(1);
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-D', {
        temporaryLocation: false,
      });
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('no-overwrite: skips when D already carries a DIFFERENT externalReference', async () => {
      // D is owned by the sender and lives in the room bucket, but it ALREADY
      // references mediaX. A fresh echo carrying media-Y must NOT overwrite it
      // (that would detach the earlier message referencing mediaX).
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        externalReference: 'media-X',
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        // media-Y slot is free here — the OLD guard would have stamped it.
        [CONV_BUCKET]: null,
        [MATRIX_MEDIA_BUCKET]: {
          id: 'doc-twin',
          storageBucketId: MATRIX_MEDIA_BUCKET,
        },
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      // Neither the overwrite stamp nor the twin delete fires.
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });

    it('stamps when D has no existing externalReference (unset slot)', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        externalReference: undefined,
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        [CONV_BUCKET]: null,
        [MATRIX_MEDIA_BUCKET]: {
          id: 'doc-twin',
          storageBucketId: MATRIX_MEDIA_BUCKET,
        },
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-D', {
        externalReference: 'media-Y',
      });
      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'doc-twin'
      );
    });

    it('idempotent: no re-stamp when D already references exactly media_id', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-D',
        createdBy: 'sender-1',
        externalReference: 'media-Y',
        storageBucket: { id: CONV_BUCKET },
      } as any);
      mockByReference({
        // media-Y already resolves to D in this bucket; twin already swept.
        [CONV_BUCKET]: { id: 'doc-D', storageBucketId: CONV_BUCKET },
        [MATRIX_MEDIA_BUCKET]: null,
      });

      await service.rehomeInboundAttachments(conversationRoom, 'sender-1', [
        outboundEcho,
      ]);

      // The reference is identical → no stamp, and nothing to delete.
      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // --- T013 read resolution ---

  describe('resolveMessageAttachments', () => {
    it('resolves an outbound (document_id) attachment owned by the sender and READ-gates it', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
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
          sender: 'sender-1',
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

    it('read-heal (full-gate [0]): pins a still-temporary outbound doc durable on read — delivered message is proof-of-send', async () => {
      // The message EXISTS (it is being read), so it was delivered — yet its doc
      // is still temporary: the post-send flip and the echo pin both failed.
      // The read must heal it so the 24h sweep cannot reap it.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        temporaryLocation: true,
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-1', mime_type: 'image/png', size: 1000 },
          ],
        } as any,
        {} as any
      );

      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
      expect(result).toEqual([expect.objectContaining({ id: 'doc-1' })]);
    });

    it('read-heal (full-gate [0]): a pin failure NEVER fails the read — the attachment is still returned', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        temporaryLocation: true,
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      fileServiceAdapter.moveDocument.mockRejectedValue(
        new Error('file-service down')
      );
      authorizationService.isAccessGranted.mockReturnValue(true);
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-1'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-1', mime_type: 'image/png', size: 1000 },
          ],
        } as any,
        {} as any
      );

      // The pin was attempted, rejected — and the read still succeeded.
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith('doc-1', {
        temporaryLocation: false,
      });
      expect(result).toEqual([expect.objectContaining({ id: 'doc-1' })]);
    });

    it('read-heal (full-gate [0]): no redundant pin when the outbound doc is already durable', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        temporaryLocation: false,
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-1', mime_type: 'image/png', size: 1000 },
          ],
        } as any,
        {} as any
      );

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ id: 'doc-1' })]);
    });

    it('attribution-spoof: ignores an outbound document_id owned by another member (forged under the sender)', async () => {
      // The message claims to be from sender-1, but document_id points at a doc
      // owned by another member that lives in the same conversation bucket.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-victim',
        createdBy: 'victim-member',
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-victim', mime_type: 'image/png', size: 1 },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([]);
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
        createdBy: 'sender-1',
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
          sender: 'sender-1',
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

    it('[4] carries the by-reference image dimensions onto the resolved inbound attachment', async () => {
      // imageWidth/imageHeight are TRANSIENT, file-service-owned fields
      // (content_metadata) — the getDocumentOrFail DB load leaves them undefined.
      // The by-reference `ref` already carries them, so the resolved
      // MessageAttachment must surface width/height (clients render with intrinsic
      // dimensions, no layout reflow) with zero extra I/O.
      fileServiceAdapter.getDocumentByReference.mockResolvedValue({
        id: 'doc-rehomed',
        imageWidth: 640,
        imageHeight: 480,
      } as any);
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        createdBy: 'sender-1',
        displayName: 'pic.png',
        mimeType: 'image/png',
        size: 1000,
        // No imageWidth/imageHeight on the DB-loaded doc — the transient dims are
        // lost on a getDocumentOrFail load; they must come from the ref.
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(true);
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-rehomed'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { media_id: 'media-1', mime_type: 'image/png', size: 1 },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([
        expect.objectContaining({
          id: 'doc-rehomed',
          width: 640,
          height: 480,
        }),
      ]);
    });

    it('[4] leaves width/height undefined when the by-reference ref carries no dimensions (non-image content)', async () => {
      // A PDF / non-image ref has no imageWidth/imageHeight — the carry-over is
      // guarded on presence, so the resolved attachment stays dimensionless
      // rather than stamping undefined-over-nothing.
      fileServiceAdapter.getDocumentByReference.mockResolvedValue({
        id: 'doc-rehomed',
      } as any);
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        createdBy: 'sender-1',
        displayName: 'doc.pdf',
        mimeType: 'application/pdf',
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { media_id: 'media-1', mime_type: 'application/pdf', size: 1 },
          ],
        } as any,
        {} as any
      );

      expect(result).toEqual([
        expect.objectContaining({
          id: 'doc-rehomed',
          width: undefined,
          height: undefined,
        }),
      ]);
    });

    it('FIX 2: lazily re-homes an inbound media_id that missed the bucket lookup, then resolves it', async () => {
      // Eager re-home failed transiently → media still in matrix_media staging,
      // so the bucket-scoped lookup misses. The read path must lazily re-home
      // (MOVE) and then resolve the now-homed doc, instead of returning nothing
      // forever.
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null) // (1) initial bucket-scoped miss
        .mockResolvedValueOnce(null) // (2) rehomeOne: not already in target
        .mockResolvedValueOnce({
          id: 'doc-staging',
          storageBucketId: MATRIX_MEDIA_BUCKET,
          mimeType: 'image/png',
        } as any) // (3) rehomeOne: global canonical lookup
        .mockResolvedValueOnce({ id: 'doc-rehomed' } as any); // (4) re-run after re-home
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        createdBy: 'sender-1',
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
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

      // The lazy re-home MOVEd the staging doc into the conversation bucket...
      expect(fileServiceAdapter.moveDocument).toHaveBeenCalledWith(
        'doc-staging',
        expect.objectContaining({
          storageBucketId: CONV_BUCKET,
          createdBy: 'sender-1',
          externalReference: 'media-1',
        })
      );
      // ...and the attachment now resolves instead of being permanently invisible.
      expect(result).toEqual([expect.objectContaining({ id: 'doc-rehomed' })]);
    });

    it('FIX 2: does not lazily re-home when the sender is unknown (cannot attribute)', async () => {
      // No sender → the re-home cannot stamp createdBy / mint attribution, so it
      // must be skipped and the attachment omitted (still self-heals once a read
      // carries a sender).
      fileServiceAdapter.getDocumentByReference.mockResolvedValue(null);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          storageBucketId: CONV_BUCKET,
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

      expect(fileServiceAdapter.moveDocument).not.toHaveBeenCalled();
      expect(fileServiceAdapter.copyDocument).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('[4] fast path: an outbound read with storageBucketId set never calls getStorageBucketOrFail', async () => {
      // The live-subscription fast path carries the bucket id on the message. The
      // common read cases (here: outbound-echo id resolution) never need the full
      // bucket, so resolveMessageBucket must resolve the id query-free — no
      // getStorageBucketOrFail round-trip + auth join per subscription message.
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-1', mime_type: 'image/png', size: 1000 },
          ],
        } as any,
        {} as any
      );

      expect(
        storageBucketService.getStorageBucketOrFail
      ).not.toHaveBeenCalled();
      expect(result).toEqual([expect.objectContaining({ id: 'doc-1' })]);
    });

    it('[4] fast path inbound miss: lazy-loads the bucket via getStorageBucketOrFail ONLY when a re-home is needed', async () => {
      // storageBucketId is set (fast path) so resolveMessageBucket returns the id
      // with NO bucket. An inbound (media_id) miss needs bucket.authorization to
      // mint the doc auth, so the full bucket must be loaded LAZILY here — and only
      // now, not eagerly for every message.
      const rehomeSpy = vi
        .spyOn(service as any, 'rehomeOne')
        .mockResolvedValue(undefined);
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null) // initial bucket-scoped miss
        .mockResolvedValue({ id: 'doc-rehomed' } as any); // re-lookup after re-home
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        createdBy: 'sender-1',
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { media_id: 'media-1', mime_type: 'image/png', size: 1 },
          ],
        } as any,
        {} as any
      );

      // The bucket was lazy-loaded exactly for the re-home.
      expect(storageBucketService.getStorageBucketOrFail).toHaveBeenCalledWith(
        CONV_BUCKET,
        { relations: { authorization: true } }
      );
      expect(rehomeSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual([expect.objectContaining({ id: 'doc-rehomed' })]);
    });

    it('[1] single-flight: two concurrent inbound-miss reads for the same media_id re-home the WRITE ONCE but load the bucket PER-READER', async () => {
      // Both attachments carry the SAME media_id and both MISS the bucket-scoped
      // lookup. Without coalescing each would re-home the same media (orphaned auth
      // on MOVE / duplicate doc on COPY). Single-flight collapses the WRITE to ONE
      // rehomeOne invocation. FIX [1] round-5c: the read-only bucket load is
      // intentionally PER-READER (fault isolation) — a transient bucket-load
      // failure for one reader must NOT cascade to concurrent coalesced readers, so
      // getStorageBucketOrFail is called once PER reader (twice here), the accepted
      // cheap cost of that isolation. Only the WRITE is coalesced.
      const rehomeSpy = vi
        .spyOn(service as any, 'rehomeOne')
        .mockResolvedValue(undefined);
      fileServiceAdapter.getDocumentByReference
        .mockResolvedValueOnce(null) // attachment A initial miss
        .mockResolvedValueOnce(null) // attachment B initial miss
        .mockResolvedValue({ id: 'doc-rehomed' } as any); // both re-lookups hit
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-rehomed',
        createdBy: 'sender-1',
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
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { media_id: 'media-same', mime_type: 'image/png', size: 1 },
            { media_id: 'media-same', mime_type: 'image/png', size: 1 },
          ],
        } as any,
        {} as any
      );

      // The WRITE is still coalesced — the key [1] invariant (one placement, so no
      // duplicate mint+MOVE / COPY).
      expect(rehomeSpy).toHaveBeenCalledTimes(1);
      // The read-only bucket load is PER-READER for fault isolation — each of the
      // two concurrent readers loads its own bucket (the deliberate trade).
      expect(storageBucketService.getStorageBucketOrFail).toHaveBeenCalledTimes(
        2
      );
      expect(result).toEqual([
        expect.objectContaining({ id: 'doc-rehomed' }),
        expect.objectContaining({ id: 'doc-rehomed' }),
      ]);
    });

    it('denies a non-member (READ not granted)', async () => {
      documentService.getDocumentOrFail.mockResolvedValue({
        id: 'doc-1',
        createdBy: 'sender-1',
        storageBucket: { id: CONV_BUCKET },
        authorization: { id: 'doc-auth' },
      } as any);
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
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

    it('read path degrades gracefully: a transient bucket-resolution throw omits attachments, never fails the read (FIX B)', async () => {
      // History read (no storageBucketId, roomID present). getTargetBucketForRoom
      // → conversationRepository.findOne throws transiently; the resolver must NOT
      // propagate — attachments are omitted, the history query still succeeds.
      roomRepository.findOne.mockResolvedValue({
        id: 'room-1',
        type: RoomType.CONVERSATION_GROUP,
      });
      conversationRepository.findOne.mockRejectedValueOnce(
        new Error('db down during read')
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
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

      expect(result).toEqual([]);
    });

    it('fault-isolates a per-attachment failure: one attachment throwing omits ONLY it, the read still succeeds (FIX 2)', async () => {
      // Two outbound attachments. Resolving the SECOND throws where the round-2
      // guard did NOT reach — the READ-gate (isAccessGranted) on a malformed auth
      // relation. The batch must not reject: the good attachment resolves, the
      // failing one is omitted, the whole getMessages query still succeeds.
      documentService.getDocumentOrFail.mockImplementation(
        async (id: string) =>
          ({
            id,
            createdBy: 'sender-1',
            displayName: `${id}.png`,
            mimeType: 'image/png',
            size: 10,
            storageBucket: { id: CONV_BUCKET },
            authorization: { id: id === 'doc-bad' ? 'bad-auth' : 'good-auth' },
          }) as any
      );
      authorizationService.isAccessGranted.mockImplementation(
        (_ctx: any, auth: any) => {
          if (auth?.id === 'bad-auth') {
            throw new Error('auth check blew up on a malformed relation');
          }
          return true;
        }
      );
      documentService.getPubliclyAccessibleURL.mockReturnValue(
        'https://docs/doc-good'
      );

      const result = await service.resolveMessageAttachments(
        {
          id: 'm1',
          sender: 'sender-1',
          storageBucketId: CONV_BUCKET,
          rawAttachments: [
            { document_id: 'doc-good', mime_type: 'image/png', size: 10 },
            { document_id: 'doc-bad', mime_type: 'image/png', size: 10 },
          ],
        } as any,
        {} as any
      );

      // The whole query did NOT reject; only the failing attachment is omitted.
      expect(result).toEqual([expect.objectContaining({ id: 'doc-good' })]);
    });
  });
});
