import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { IMessage } from '../message/message.interface';
import { IRoom } from '../room/room.interface';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from './message.attachment.service';

const providerID = '11111111-1111-4111-8111-111111111111';
const documentID = '22222222-2222-4222-8222-222222222222';
const room = { id: 'room', type: RoomType.CONVERSATION_GROUP } as IRoom;
const actor = { actorID: 'bob' } as ActorContext;
const raw: ReceivedAttachment = {
  media_id: 'media',
  display_name: 'from-element.png',
  mime_type: 'image/png',
  size: 10,
};
const message = (attachment = raw): IMessage => ({
  id: 'event',
  message: '',
  sender: 'alice',
  timestamp: 1,
  reactions: [],
  roomID: room.id,
  rawAttachments: [attachment],
});
const makeDocument = (values: Partial<IDocument> = {}): IDocument =>
  ({
    id: documentID,
    displayName: 'stored.png',
    mimeType: 'image/png',
    size: 10,
    externalID: 'hash',
    externalReference: 'media',
    storageBucket: { id: 'conversation' },
    authorization: { id: 'policy' },
    createdBy: 'alice',
    temporaryLocation: false,
    ...values,
  }) as IDocument;

describe('MessageAttachmentService', () => {
  const documents = createMock<DocumentService>();
  const storage = createMock<StorageBucketService>();
  const auth = createMock<AuthorizationService>();
  const aggregators = createMock<StorageAggregatorResolverService>();
  const rooms = createMock<RoomResolverService>();
  const documentRepository = { find: vi.fn() };
  const conversationRepository = { findOne: vi.fn() };
  const roomRepository = { findOne: vi.fn() };
  const bucket = {
    id: 'conversation',
    authorization: { id: 'bucket-policy' },
    allowedMimeTypes: ['image/png'],
    maxFileSize: 50,
  };
  let service: MessageAttachmentService;
  let provider: IDocument;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = makeDocument({
      id: providerID,
      displayName: 'media',
      storageBucket: { id: 'matrix' } as any,
      authorization: undefined,
    });
    documentRepository.find.mockResolvedValue([provider]);
    roomRepository.findOne.mockResolvedValue(room);
    conversationRepository.findOne.mockResolvedValue({
      storageAggregator: { directStorage: bucket },
    });
    documents.getDocumentOrFail.mockResolvedValue(makeDocument());
    documents.getPubliclyAccessibleURL.mockReturnValue(
      'https://alkemio.test/api/private/rest/storage/document'
    );
    auth.isAccessGranted.mockReturnValue(true);
    storage.copyDocumentToBucket.mockResolvedValue(makeDocument());
    service = new MessageAttachmentService(
      { get: () => 'matrix' } as unknown as ConfigService<AlkemioConfig, true>,
      documents,
      storage,
      auth,
      aggregators,
      rooms,
      conversationRepository as any,
      roomRepository as any,
      documentRepository as any,
      { warn: vi.fn(), error: vi.fn(), log: vi.fn() }
    );
  });

  it('allows an authorized member to send an existing durable document', async () => {
    const refs = await service.resolveOutboundAttachments(room, actor, [
      documentID,
    ]);
    expect(refs).toEqual([
      {
        documentId: documentID,
        displayName: 'stored.png',
        mimeType: 'image/png',
        size: 10,
      },
    ]);
    expect(auth.grantAccessOrFail).toHaveBeenCalledWith(
      actor,
      expect.anything(),
      AuthorizationPrivilege.READ,
      expect.any(String)
    );
  });

  it.each([
    { storageBucket: { id: 'other' } },
    { size: 51 },
    { mimeType: 'application/x-executable' },
  ])('rejects an out-of-scope or disallowed outbound document: %j', async overrides => {
    documents.getDocumentOrFail.mockResolvedValue(
      makeDocument(overrides as any)
    );
    await expect(
      service.resolveOutboundAttachments(room, actor, [documentID])
    ).rejects.toThrow();
  });

  it('rejects an outbound batch before loading documents', async () => {
    await expect(
      service.resolveOutboundAttachments(room, actor, [documentID, providerID])
    ).rejects.toThrow('one attachment');
    expect(documents.getDocumentOrFail).not.toHaveBeenCalled();
  });

  it('copies Element media before any read and leaves the provider row unchanged', async () => {
    const before = structuredClone(provider);
    expect(await service.prepareInboundAttachments(room, 'alice', [raw])).toBe(
      'conversation'
    );
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      provider,
      'alice',
      false,
      {
        externalReference: 'media',
        displayName: 'from-element.png',
      }
    );
    expect(provider).toEqual(before);
  });

  it('reuses a web hint only for the same bucket and content hash', async () => {
    documentRepository.find.mockResolvedValue([
      provider,
      makeDocument({ externalReference: undefined }),
    ]);
    await service.prepareInboundAttachments(room, 'bob', [
      { ...raw, document_id: documentID },
    ]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });

  it.each([
    { externalID: 'different-bytes' },
    { storageBucket: { id: 'other-conversation' } },
    { authorization: undefined },
  ])('ignores an invalid hint and copies the actual media: %j', async overrides => {
    documentRepository.find.mockResolvedValue([
      provider,
      makeDocument({ externalReference: undefined, ...overrides } as any),
    ]);
    await service.prepareInboundAttachments(room, 'bob', [
      { ...raw, document_id: documentID },
    ]);
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      provider,
      'bob',
      false,
      expect.anything()
    );
  });

  it('a repeated event reuses the scoped conversation copy', async () => {
    documentRepository.find.mockResolvedValue([provider, makeDocument()]);
    await service.prepareInboundAttachments(room, 'bob', [raw]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });

  it('forwards media to another conversation with its own copy', async () => {
    conversationRepository.findOne.mockResolvedValue({
      storageAggregator: { directStorage: { ...bucket, id: 'other' } },
    });
    documentRepository.find.mockResolvedValue([provider, makeDocument()]);
    await service.prepareInboundAttachments(room, 'bob', [raw]);
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'other',
      provider,
      'bob',
      false,
      expect.anything()
    );
  });

  it('propagates a placement failure to the receipt boundary', async () => {
    storage.copyDocumentToBucket.mockRejectedValue(
      new Error('copy unavailable')
    );
    await expect(
      service.prepareInboundAttachments(room, 'alice', [raw])
    ).rejects.toThrow('copy unavailable');
  });

  it('leaves unsupported or absent provider media unavailable without copying', async () => {
    provider.size = 51;
    await service.prepareInboundAttachments(room, 'alice', [raw]);
    documentRepository.find.mockResolvedValue([]);
    await service.prepareInboundAttachments(room, 'alice', [raw]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });

  it('reads use the event name and authorized document metadata, without writes', async () => {
    documentRepository.find.mockResolvedValue([provider, makeDocument()]);
    const result = await service.resolveMessageAttachments(
      message({ ...raw, width: 24, height: 24 }),
      actor
    );
    expect(result).toEqual([
      {
        id: documentID,
        url: expect.any(String),
        displayName: 'from-element.png',
        mimeType: 'image/png',
        size: 10,
        width: 24,
        height: 24,
      },
    ]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });

  it('denied and missing documents expose only the event filename', async () => {
    documentRepository.find.mockResolvedValue([provider, makeDocument()]);
    auth.isAccessGranted.mockReturnValue(false);
    expect(await service.resolveMessageAttachments(message(), actor)).toEqual([
      { displayName: raw.display_name },
    ]);
    documentRepository.find.mockResolvedValue([]);
    expect(await service.resolveMessageAttachments(message(), actor)).toEqual([
      { displayName: raw.display_name },
    ]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });

  it('batch history performs one document lookup across all field resolutions', async () => {
    documentRepository.find.mockResolvedValue([provider, makeDocument()]);
    const messages = [
      message(),
      message({
        ...raw,
        document_id: documentID,
        display_name: 'reshared.png',
      }),
    ];
    await service.stampAttachmentBucket(room, messages);
    const results = await Promise.all(
      messages.map(item => service.resolveMessageAttachments(item, actor))
    );
    expect(documentRepository.find).toHaveBeenCalledTimes(1);
    expect(results.map(items => items[0].displayName)).toEqual([
      'from-element.png',
      'reshared.png',
    ]);
  });

  it('comment media uses the existing callout bucket', async () => {
    rooms.getCalloutForRoom.mockResolvedValue({ id: 'callout' } as any);
    aggregators.getStorageAggregatorForCallout.mockResolvedValue({
      directStorage: bucket,
    } as any);
    await service.prepareInboundAttachments(
      { ...room, type: RoomType.CALLOUT },
      'alice',
      [raw]
    );
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      provider,
      'alice',
      false,
      expect.anything()
    );
  });
});

it('normalizes names to the existing file-service contract without splitting UTF-8', () => {
  expect(sanitizeAttachmentDisplayName(' a/b\\c\x01.png ', 'media')).toBe(
    'a_b_c.png'
  );
  expect(sanitizeAttachmentDisplayName('😀'.repeat(200), 'media')).toBe(
    '😀'.repeat(128)
  );
  expect(sanitizeAttachmentDisplayName('  ', 'media')).toBe('media');
});
