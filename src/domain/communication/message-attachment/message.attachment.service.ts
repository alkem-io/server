import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { MimeFileType } from '@common/enums/mime.file.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IRoom } from '@domain/communication/room/room.interface';
import { isConversationRoom } from '@domain/communication/room/room.utils';
import { Document } from '@domain/storage/document/document.entity';
import { IDocument } from '@domain/storage/document/document.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FileServiceAdapterException,
  StorageServiceUnavailableException,
} from '@services/adapters/file-service-adapter/file.service.adapter.exception';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';

// Match file-service's existing filename contract, including its UTF-8 byte cap.
export const sanitizeAttachmentDisplayName = (
  displayName: string | undefined | null,
  fallback: string
): string => {
  let cleaned = '';
  for (const character of displayName ?? '') {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) continue;
    cleaned += character === '/' || character === '\\' ? '_' : character;
  }
  const bytes = Buffer.from(cleaned.trim(), 'utf8');
  let end = Math.min(bytes.length, 512);
  while (end > 0 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString('utf8').trim() || fallback;
};

@Injectable()
export class MessageAttachmentService {
  private readonly matrixMediaBucketId: string;

  constructor(
    config: ConfigService<AlkemioConfig, true>,
    private readonly storageBucketService: StorageBucketService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    private readonly roomResolverService: RoomResolverService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.matrixMediaBucketId = config.get(
      'storage.file_service.matrix_media_bucket_id',
      { infer: true }
    );
  }

  // Both Element events and web echoes use this placement before publication.
  public async prepareInboundAttachments(
    room: IRoom,
    senderActorID: string,
    attachments: ReceivedAttachment[] | undefined
  ): Promise<string | undefined> {
    if (!attachments?.length) return undefined;
    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket) return undefined;
    const documents = await this.loadDocuments(bucket.id, attachments);
    for (const attachment of attachments) {
      if (!attachment.media_id) continue;
      const targetKey = this.referenceKey(bucket.id, attachment.media_id);
      const existing = documents.get(targetKey);
      if (existing) {
        this.assertCompleteAssociation(existing);
        continue;
      }
      const stagedKey = this.referenceKey(
        this.matrixMediaBucketId,
        attachment.media_id
      );
      const source =
        documents.get(stagedKey) ??
        (await this.documentRepository.findOne({
          where: { externalReference: attachment.media_id },
          relations: { storageBucket: true, authorization: true, tagset: true },
          order: { createdDate: 'ASC', id: 'ASC' },
        }));
      if (!source || !this.matchesBucketPolicy(bucket, source)) continue;
      const displayName = sanitizeAttachmentDisplayName(
        attachment.display_name,
        source.displayName
      );
      const canMove = source.storageBucket.id === this.matrixMediaBucketId;
      const document = await this.placeSource(
        bucket,
        attachment,
        source,
        senderActorID,
        displayName,
        canMove
      );
      this.assertCompleteAssociation(document);
      documents.set(targetKey, document);
      if (canMove) documents.delete(stagedKey);
    }
    return bucket.id;
  }

  private async placeSource(
    bucket: IStorageBucket,
    attachment: ReceivedAttachment,
    source: IDocument,
    actorID: string,
    displayName: string,
    canMove: boolean
  ): Promise<IDocument> {
    const copy = (document: IDocument) =>
      this.storageBucketService.copyDocumentToBucket(
        bucket.id,
        document,
        actorID,
        false,
        { externalReference: attachment.media_id, displayName }
      );
    try {
      return canMove
        ? await this.storageBucketService.moveDocumentToBucket(
            bucket.id,
            source,
            actorID,
            this.matrixMediaBucketId,
            { displayName }
          )
        : await copy(source);
    } catch (error) {
      const recoverable =
        error instanceof StorageServiceUnavailableException ||
        (error instanceof FileServiceAdapterException &&
          (error.httpStatus === undefined ||
            error.httpStatus === 409 ||
            error.httpStatus >= 500));
      if (!recoverable) throw error;
      // One re-resolution, never an automatic replay of the conditional MOVE.
      const existing = await this.documentRepository.findOne({
        where: {
          storageBucket: { id: bucket.id },
          externalReference: attachment.media_id,
        },
        relations: { storageBucket: true, authorization: true, tagset: true },
      });
      if (existing) {
        this.assertCompleteAssociation(existing);
        return existing;
      }
      const winner = await this.documentRepository.findOne({
        where: { externalReference: attachment.media_id },
        relations: { storageBucket: true, authorization: true, tagset: true },
        order: { createdDate: 'ASC', id: 'ASC' },
      });
      if (!winner || winner.storageBucket.id === this.matrixMediaBucketId)
        throw error;
      if (winner.storageBucket.id === bucket.id) {
        this.assertCompleteAssociation(winner);
        return winner;
      }
      // Another destination won the first MOVE. Its association is retained;
      // COPY applies this target's freshly composed policy. Later failures use
      // the existing receipt retry owner, without a recursive conflict loop.
      return copy(winner);
    }
  }

  private async loadDocuments(
    bucketId: string,
    attachments: ReceivedAttachment[]
  ): Promise<Map<string, IDocument>> {
    const refs = [
      ...new Set(
        attachments.flatMap(item => (item.media_id ? [item.media_id] : []))
      ),
    ];
    if (!refs.length) return new Map();
    const rows = await this.documentRepository.find({
      where: {
        storageBucket: { id: In([bucketId, this.matrixMediaBucketId]) },
        externalReference: In(refs),
      },
      relations: { storageBucket: true, authorization: true, tagset: true },
    });
    return new Map(
      rows
        .filter(row => row.externalReference)
        .map(row => [
          this.referenceKey(row.storageBucket.id, row.externalReference!),
          row,
        ])
    );
  }

  private assertCompleteAssociation(document: IDocument): void {
    if (!document.authorization?.id || !document.tagset?.id)
      throw new ValidationException(
        'Incomplete attachment association',
        LogContext.COMMUNICATION,
        { documentID: document.id }
      );
  }

  private referenceKey(bucketId: string, mediaId: string | undefined): string {
    return `${bucketId}:${mediaId ?? ''}`;
  }

  public matchesBucketPolicy(
    bucket: IStorageBucket,
    document: { mimeType: string; size: number }
  ): boolean {
    return (
      (!bucket.allowedMimeTypes?.length ||
        bucket.allowedMimeTypes.includes(document.mimeType as MimeFileType)) &&
      (!(bucket.maxFileSize > 0) || document.size <= bucket.maxFileSize)
    );
  }

  public async getTargetBucketForRoom(
    room: IRoom
  ): Promise<IStorageBucket | undefined> {
    if (isConversationRoom(room)) {
      const conversation = await this.conversationRepository.findOne({
        where: { room: { id: room.id } },
        relations: {
          storageAggregator: { directStorage: { authorization: true } },
        },
      });
      return conversation?.storageAggregator?.directStorage ?? undefined;
    }

    if (this.isCommentRoom(room)) {
      return this.getCommentRoomParentBucket(room);
    }

    this.logger.warn?.(
      {
        message: 'Unsupported room type for attachments',
        roomId: room.id,
        roomType: room.type,
      },
      LogContext.COMMUNICATION
    );
    return undefined;
  }

  private async getCommentRoomParentBucket(
    room: IRoom
  ): Promise<IStorageBucket | undefined> {
    const calloutId = await this.resolveParentCalloutId(room);
    if (!calloutId) {
      this.logger.warn?.(
        {
          message:
            'Comment-room attachment: unable to resolve parent callout; media remains unavailable',
          roomId: room.id,
          roomType: room.type,
        },
        LogContext.COMMUNICATION
      );
      return undefined;
    }

    const aggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCallout(
        calloutId,
        { relations: { directStorage: { authorization: true } } }
      );
    return aggregator.directStorage ?? undefined;
  }

  private async resolveParentCalloutId(
    room: IRoom
  ): Promise<string | undefined> {
    if (room.type === RoomType.CALLOUT) {
      return this.resolveCalloutIdOrUndefined(() =>
        this.roomResolverService.getCalloutForRoom(room.id)
      );
    }
    if (room.type === RoomType.POST) {
      return this.resolveCalloutIdOrUndefined(
        async () =>
          (
            await this.roomResolverService.getCalloutWithPostContributionForRoom(
              room.id
            )
          ).callout
      );
    }
    return undefined;
  }

  private async resolveCalloutIdOrUndefined(
    load: () => Promise<{ id: string } | undefined>
  ): Promise<string | undefined> {
    try {
      return (await load())?.id;
    } catch (e) {
      if (e instanceof EntityNotFoundException) {
        return undefined;
      }
      throw e;
    }
  }

  private isCommentRoom(room: IRoom): boolean {
    return room.type === RoomType.CALLOUT || room.type === RoomType.POST;
  }
}
