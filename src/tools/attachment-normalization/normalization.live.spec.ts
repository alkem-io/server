import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import type { MessageAttachmentService } from '@domain/communication/message-attachment/message.attachment.service';
import { Document } from '@domain/storage/document/document.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import type { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import type { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import type { AlkemioConfig } from '@src/types';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { LiveNormalizationPort } from './normalization.live';
import type { MediaEvent, NormalizationFile } from './normalization.types';

const staging = '00000000-0000-4000-8000-000000000013';
const target = '00000000-0000-4000-8000-000000000014';
const reference = 'abcdefghijklmnopqrstuvwx';
const event: MediaEvent = {
  roomId: 'room',
  matrixRoomId: '!room:example',
  eventId: '$event',
  senderId: 'actor',
  mediaId: reference,
  displayName: 'old.png',
  threadId: null,
  timestamp: 1,
};
const snapshot: NormalizationFile = {
  id: 'staged-P',
  bucketId: staging,
  reference,
  complete: false,
};
function fixture() {
  const source = Object.assign(new Document(), {
    id: snapshot.id,
    storageBucket: Object.assign(new StorageBucket(), { id: staging }),
    externalReference: reference,
    createdDate: new Date('2020-01-01'),
    displayName: 'staged.bin',
    authorization: undefined,
    tagset: undefined,
  }) as unknown as Document;
  // Deliberately provide no save/update/delete methods on the repository.
  // These are live-port routing tests; actual SQL/CAS is proved by the PG gate.
  const repository = { findOne: vi.fn().mockResolvedValue(source) };
  const database = { getRepository: vi.fn().mockReturnValue(repository) };
  const buckets = {
    copyDocumentToBucket: vi.fn(),
    moveDocumentToBucket: vi.fn(),
  };
  const files = {
    deleteDocument: vi.fn().mockResolvedValue({}),
  };
  const config = new ConfigService({
    storage: {
      file_service: {
        matrix_media_bucket_id: staging,
      },
    },
  }) as ConfigService<AlkemioConfig, true>;
  const port = new LiveNormalizationPort(
    database as unknown as DataSource,
    {} as MessageAttachmentService,
    buckets as unknown as StorageBucketService,
    files as unknown as FileServiceAdapter,
    config
  );
  return { source, repository, database, buckets, files, port };
}
function completeRow(): Document {
  return Object.assign(new Document(), {
    id: snapshot.id,
    storageBucket: Object.assign(new StorageBucket(), { id: target }),
    externalReference: reference,
    createdDate: new Date('2020-01-01'),
    authorization: Object.assign(
      new AuthorizationPolicy(AuthorizationPolicyType.DOCUMENT),
      { id: 'policy' }
    ),
    tagset: Object.assign(new Tagset(), {
      id: 'tagset',
      authorization: Object.assign(
        new AuthorizationPolicy(AuthorizationPolicyType.TAGSET),
        { id: 'tagset-policy' }
      ),
    }),
  });
}

describe('normalization live port boundaries', () => {
  it('requires both document and tagset policies for a complete association', async () => {
    const f = fixture();
    const row = completeRow();
    f.repository.findOne.mockResolvedValue(row);
    expect((await f.port.association(target, reference))?.complete).toBe(true);
    row.tagset.authorization = undefined;
    expect((await f.port.association(target, reference))?.complete).toBe(false);
  });
  it('delegates MOVE to the prepared-policy helper with an expected staging bucket', async () => {
    const f = fixture();
    f.buckets.moveDocumentToBucket.mockResolvedValue(completeRow());
    const before = { ...f.source };
    expect((await f.port.move(target, snapshot, event)).complete).toBe(true);
    expect(f.buckets.moveDocumentToBucket).toHaveBeenCalledWith(
      target,
      f.source,
      event.senderId,
      staging,
      { displayName: event.displayName }
    );
    expect(f.source).toEqual(before);
    expect(f.files.deleteDocument).not.toHaveBeenCalled();
  });
  it.each([
    'missing',
    'relocated',
    'reference-changed',
  ] as const)('rejects %s source before preparing any mutation', async shape => {
    const f = fixture();
    if (shape === 'missing') f.repository.findOne.mockResolvedValue(null);
    if (shape === 'relocated') f.source.storageBucket.id = target;
    if (shape === 'reference-changed') f.source.externalReference = 'changed';
    await expect(f.port.move(target, snapshot, event)).rejects.toThrow(
      'source_changed'
    );
    expect(f.buckets.moveDocumentToBucket).not.toHaveBeenCalled();
  });
  it('copies using the shared policy helper without loading or modifying ordinary documents', async () => {
    const f = fixture();
    f.buckets.copyDocumentToBucket.mockResolvedValue(completeRow());
    await f.port.copy(target, snapshot, event);
    expect(f.buckets.copyDocumentToBucket).toHaveBeenCalledWith(
      target,
      f.source,
      event.senderId,
      false,
      { externalReference: reference, displayName: event.displayName }
    );
    expect(f.repository.findOne).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: { id: snapshot.id } })
    );
    expect(f.files.deleteDocument).not.toHaveBeenCalled();
  });
  it('sends the source-bucket condition when removing a proven staging twin', async () => {
    const f = fixture();
    await f.port.removeStage(snapshot.id);
    expect(f.files.deleteDocument).toHaveBeenCalledExactlyOnceWith(
      snapshot.id,
      staging
    );
  });
  it('does not retry deletion after a concurrently moved row causes conflict', async () => {
    const f = fixture();
    f.files.deleteDocument.mockRejectedValue(new Error('conflict'));
    f.repository.findOne
      .mockResolvedValueOnce(f.source)
      .mockResolvedValueOnce(completeRow());
    await expect(f.port.removeStage(snapshot.id)).rejects.toThrow('conflict');
    expect(f.files.deleteDocument).toHaveBeenCalledTimes(1);
  });
  it('accepts ambiguous delete completion only after confirming the row is absent', async () => {
    const f = fixture();
    f.files.deleteDocument.mockRejectedValue(new Error('lost response'));
    f.repository.findOne
      .mockResolvedValueOnce(f.source)
      .mockResolvedValueOnce(null);
    await expect(f.port.removeStage(snapshot.id)).resolves.toBeUndefined();
    expect(f.files.deleteDocument).toHaveBeenCalledTimes(1);
  });
  it('refuses cleanup of an already-authorized destination', async () => {
    const f = fixture();
    f.repository.findOne.mockResolvedValue(completeRow());
    await expect(f.port.removeStage(snapshot.id)).rejects.toThrow(
      'source_changed'
    );
    expect(f.files.deleteDocument).not.toHaveBeenCalled();
  });
});
