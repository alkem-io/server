import { RoomType } from '@common/enums/room.type';
import {
  MessageAttachmentService,
  sanitizeAttachmentDisplayName,
} from '@domain/communication/message-attachment/message.attachment.service';
import { Room } from '@domain/communication/room/room.entity';
import { Document } from '@domain/storage/document/document.entity';
import { IDocument } from '@domain/storage/document/document.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types';
import { DataSource, In } from 'typeorm';
import type {
  MediaEvent,
  NormalizationFile,
  NormalizationPort,
} from './normalization.types';

export const SUPPORTED_ATTACHMENT_ROOMS = [
  RoomType.CONVERSATION,
  RoomType.CONVERSATION_DIRECT,
  RoomType.CONVERSATION_GROUP,
  RoomType.CALLOUT,
  RoomType.POST,
];

/** Uses only existing server policy composition and file-service writes. */
export class LiveNormalizationPort implements NormalizationPort {
  private readonly stageId: string;
  constructor(
    private readonly database: DataSource,
    private readonly attachments: MessageAttachmentService,
    private readonly buckets: StorageBucketService,
    private readonly files: FileServiceAdapter,
    config: ConfigService<AlkemioConfig, true>
  ) {
    this.stageId = config.get('storage.file_service.matrix_media_bucket_id', {
      infer: true,
    });
  }
  async supportedRooms(): Promise<string[]> {
    const rows = await this.database.getRepository(Room).find({
      where: { type: In(SUPPORTED_ATTACHMENT_ROOMS) },
      select: { id: true },
      order: { id: 'ASC' },
    });
    return rows.map(row => row.id);
  }
  async targetBucket(roomId: string): Promise<string | undefined> {
    const room = await this.database
      .getRepository(Room)
      .findOne({ where: { id: roomId } });
    return room
      ? (await this.attachments.getTargetBucketForRoom(room))?.id
      : undefined;
  }
  private async load(id: string): Promise<IDocument | undefined> {
    return (
      (await this.database.getRepository(Document).findOne({
        where: { id },
        relations: { storageBucket: true, authorization: true, tagset: true },
      })) ?? undefined
    );
  }
  private project(file: IDocument): NormalizationFile {
    return {
      id: file.id,
      bucketId: file.storageBucket.id,
      reference: file.externalReference,
      complete:
        !!file.authorization?.id &&
        !!file.tagset?.id &&
        !!file.tagset.authorization?.id,
      ...(file.reused !== undefined ? { reused: file.reused } : {}),
    };
  }
  async referenceSource(
    reference: string
  ): Promise<NormalizationFile | undefined> {
    const row = await this.database.getRepository(Document).findOne({
      where: { externalReference: reference },
      order: { createdDate: 'ASC', id: 'ASC' },
      relations: { storageBucket: true, authorization: true, tagset: true },
    });
    return row ? this.project(row) : undefined;
  }
  async stage(reference: string): Promise<NormalizationFile | undefined> {
    return this.association(this.stageId, reference);
  }
  async association(
    bucketId: string,
    reference: string
  ): Promise<NormalizationFile | undefined> {
    const row = await this.database.getRepository(Document).findOne({
      where: {
        storageBucket: { id: bucketId },
        externalReference: reference,
      },
      relations: { storageBucket: true, authorization: true, tagset: true },
    });
    return row ? this.project(row) : undefined;
  }
  async permitted(bucketId: string, sourceId: string): Promise<boolean> {
    const source = await this.load(sourceId);
    if (!source) return false;
    const bucket = await this.buckets.getStorageBucketOrFail(bucketId);
    return this.attachments.matchesBucketPolicy(bucket, source);
  }
  private async source(file: NormalizationFile): Promise<IDocument> {
    const source = await this.load(file.id);
    if (
      !source ||
      source.storageBucket.id !== file.bucketId ||
      source.externalReference !== file.reference
    )
      throw new Error('source_changed');
    return source;
  }
  async copy(
    bucketId: string,
    file: NormalizationFile,
    event: MediaEvent
  ): Promise<NormalizationFile> {
    if (!event.senderId) throw new Error('unmapped_sender');
    const source = await this.source(file);
    const row = await this.buckets.copyDocumentToBucket(
      bucketId,
      source,
      event.senderId,
      false,
      {
        externalReference: event.mediaId,
        displayName: sanitizeAttachmentDisplayName(
          event.displayName,
          source.displayName
        ),
      }
    );
    return this.project(row);
  }
  async move(
    bucketId: string,
    file: NormalizationFile,
    event: MediaEvent
  ): Promise<NormalizationFile> {
    if (!event.senderId || file.bucketId !== this.stageId)
      throw new Error('source_changed');
    const row = await this.buckets.moveDocumentToBucket(
      bucketId,
      await this.source(file),
      event.senderId,
      this.stageId,
      {
        displayName: sanitizeAttachmentDisplayName(
          event.displayName,
          event.mediaId
        ),
      }
    );
    return this.project(row);
  }
  async removeStage(id: string): Promise<void> {
    const row = await this.load(id);
    if (
      !row ||
      row.storageBucket.id !== this.stageId ||
      row.authorization?.id ||
      row.tagset?.id
    )
      throw new Error('source_changed');
    try {
      await this.files.deleteDocument(id, this.stageId);
    } catch (error) {
      // A lost response may follow a committed DELETE. An extant/moved row is
      // never retried or deleted without the source-bucket precondition.
      if (await this.load(id)) throw error;
    }
  }
}
