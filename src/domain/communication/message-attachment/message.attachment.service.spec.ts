import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { RoomType } from '@common/enums/room.type';
import { IDocument } from '@domain/storage/document/document.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapterException } from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { IRoom } from '../room/room.interface';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from './message.attachment.service';

const providerID = '11111111-1111-4111-8111-111111111111';
const documentID = '22222222-2222-4222-8222-222222222222';
const room = { id: 'room', type: RoomType.CONVERSATION_GROUP } as IRoom;
const raw: ReceivedAttachment = {
  media_id: 'media',
  display_name: 'from-element.png',
  mime_type: 'image/png',
  size: 10,
};
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
    tagset: { id: 'tags' },
    createdBy: 'alice',
    temporaryLocation: false,
    ...values,
  }) as IDocument;

describe('MessageAttachmentService', () => {
  const storage = createMock<StorageBucketService>();
  const aggregators = createMock<StorageAggregatorResolverService>();
  const rooms = createMock<RoomResolverService>();
  const documentRepository = { find: vi.fn(), findOne: vi.fn() };
  const conversationRepository = { findOne: vi.fn() };
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
    conversationRepository.findOne.mockResolvedValue({
      storageAggregator: { directStorage: bucket },
    });
    storage.copyDocumentToBucket.mockResolvedValue(makeDocument());
    storage.moveDocumentToBucket.mockResolvedValue(
      makeDocument({ id: providerID })
    );
    service = new MessageAttachmentService(
      { get: () => 'matrix' } as unknown as ConfigService<AlkemioConfig, true>,
      storage,
      aggregators,
      rooms,
      conversationRepository as any,
      documentRepository as any,
      { warn: vi.fn(), error: vi.fn(), log: vi.fn() }
    );
  });

  it('moves staging media with its identity and completes before publication', async () => {
    provider.createdDate = new Date('2026-09-01T00:00:00.000Z');
    await service.prepareInboundAttachments(room, 'alice', [raw]);
    expect(storage.moveDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      provider,
      'alice',
      'matrix',
      { displayName: raw.display_name }
    );
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
  });
  it.each([
    409,
    undefined,
  ])('re-resolves an already committed target after MOVE error %s', async status => {
    provider.createdDate = new Date('2026-09-01T00:00:00.000Z');
    storage.moveDocumentToBucket.mockRejectedValue(
      new FileServiceAdapterException(
        'uncertain/conflict',
        'moveDocument',
        status
      )
    );
    const target = makeDocument({ id: providerID });
    documentRepository.findOne.mockResolvedValue(target);
    await expect(
      service.prepareInboundAttachments(room, 'alice', [raw])
    ).resolves.toBe('conversation');
    expect(storage.moveDocumentToBucket).toHaveBeenCalledTimes(1);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
    expect(documentRepository.findOne).toHaveBeenCalledTimes(1);
    expect(documentRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storageBucket: { id: 'conversation' },
          externalReference: 'media',
        },
      })
    );
  });
  it('copies the winner in another bucket after one source conflict without a second MOVE', async () => {
    provider.createdDate = new Date('2026-09-01T00:00:00.000Z');
    storage.moveDocumentToBucket.mockRejectedValue(
      new FileServiceAdapterException('conflict', 'moveDocument', 409)
    );
    const winner = makeDocument({
      id: providerID,
      storageBucket: { id: 'first' } as any,
    });
    documentRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);
    await expect(
      service.prepareInboundAttachments(room, 'bob', [raw])
    ).resolves.toBe('conversation');
    expect(storage.moveDocumentToBucket).toHaveBeenCalledTimes(1);
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      winner,
      'bob',
      false,
      expect.objectContaining({ externalReference: 'media' })
    );
    expect(documentRepository.findOne).toHaveBeenCalledTimes(2);
  });

  it('copies an already placed source without stealing its original bucket', async () => {
    documentRepository.find.mockResolvedValue([]);
    const source = makeDocument({
      id: providerID,
      storageBucket: { id: 'first' } as any,
    });
    documentRepository.findOne.mockResolvedValue(source);
    await service.prepareInboundAttachments(room, 'bob', [raw]);
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      source,
      'bob',
      false,
      expect.objectContaining({ externalReference: 'media' })
    );
    expect(storage.moveDocumentToBucket).not.toHaveBeenCalled();
  });
  it('reuses a complete canonical association without needing a staging row', async () => {
    documentRepository.find.mockResolvedValue([makeDocument()]);
    await service.prepareInboundAttachments(room, 'bob', [raw]);
    expect(documentRepository.findOne).not.toHaveBeenCalled();
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
    expect(storage.moveDocumentToBucket).not.toHaveBeenCalled();
  });
  it('diagnoses an incomplete destination instead of looping on its unique reference', async () => {
    documentRepository.find.mockResolvedValue([
      provider,
      makeDocument({ tagset: undefined }),
    ]);
    await expect(
      service.prepareInboundAttachments(room, 'bob', [raw])
    ).rejects.toThrow('Incomplete attachment association');
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
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
    documentRepository.find.mockResolvedValue([makeDocument()]);
    documentRepository.findOne.mockResolvedValue(makeDocument());
    await service.prepareInboundAttachments(room, 'bob', [raw]);
    expect(storage.copyDocumentToBucket).toHaveBeenCalledWith(
      'other',
      expect.objectContaining({ storageBucket: { id: 'conversation' } }),
      'bob',
      false,
      expect.anything()
    );
  });

  it('propagates a placement failure to the receipt boundary', async () => {
    storage.moveDocumentToBucket.mockRejectedValue(
      new Error('move unavailable')
    );
    await expect(
      service.prepareInboundAttachments(room, 'alice', [raw])
    ).rejects.toThrow('move unavailable');
  });

  it('leaves unsupported or absent provider media unavailable without copying', async () => {
    provider.size = 51;
    await service.prepareInboundAttachments(room, 'alice', [raw]);
    documentRepository.find.mockResolvedValue([]);
    await service.prepareInboundAttachments(room, 'alice', [raw]);
    expect(storage.copyDocumentToBucket).not.toHaveBeenCalled();
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
    expect(storage.moveDocumentToBucket).toHaveBeenCalledWith(
      'conversation',
      provider,
      'alice',
      'matrix',
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
