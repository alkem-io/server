import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { MimeFileType } from '@common/enums/mime.file.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Room } from '@domain/communication/room/room.entity';
import { IRoom } from '@domain/communication/room/room.interface';
import { isConversationRoom } from '@domain/communication/room/room.utils';
import { Document } from '@domain/storage/document/document.entity';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationMessageAttachment } from '@services/adapters/communication-adapter/dto/communication.message.attachment';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isUUID } from 'class-validator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { IMessage } from '../message/message.interface';
import { IMessageAttachment } from './message.attachment.interface';

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
    private readonly documentService: DocumentService,
    private readonly storageBucketService: StorageBucketService,
    private readonly authorizationService: AuthorizationService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    private readonly roomResolverService: RoomResolverService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
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

  public async resolveOutboundAttachments(
    room: IRoom,
    actorContext: ActorContext,
    documentIds: string[] | undefined
  ): Promise<CommunicationMessageAttachment[]> {
    if (!documentIds?.length) return [];
    if (documentIds.length !== 1) {
      throw new ValidationException(
        'Send one attachment per message',
        LogContext.COMMUNICATION
      );
    }
    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket)
      throw new ValidationException(
        'Attachments are not supported in this room',
        LogContext.COMMUNICATION
      );
    const document = await this.documentService.getDocumentOrFail(
      documentIds[0],
      {
        relations: { authorization: true, storageBucket: true },
      }
    );
    if (document.storageBucket?.id !== bucket.id) {
      throw new ValidationException(
        'Attachment does not belong to this conversation',
        LogContext.COMMUNICATION
      );
    }
    this.authorizationService.grantAccessOrFail(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.READ,
      `send message attachment: ${document.id}`
    );
    if (!this.matchesBucketPolicy(bucket, document)) {
      throw new ValidationException(
        'Attachment type or size is not permitted in this room',
        LogContext.COMMUNICATION
      );
    }
    return [
      {
        documentId: document.id,
        displayName: document.displayName,
        mimeType: document.mimeType,
        size: document.size,
      },
    ];
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
      const provider = documents.get(
        this.referenceKey(this.matrixMediaBucketId, attachment.media_id)
      );
      if (!provider || !this.matchesBucketPolicy(bucket, provider)) continue;
      if (this.resolveDocument(attachment, bucket.id, documents)) continue;
      const document = await this.storageBucketService.copyDocumentToBucket(
        bucket.id,
        provider,
        senderActorID,
        false,
        {
          externalReference: attachment.media_id,
          displayName: sanitizeAttachmentDisplayName(
            attachment.display_name,
            provider.displayName
          ),
        }
      );
      documents.set(
        this.referenceKey(bucket.id, attachment.media_id),
        document
      );
    }
    return bucket.id;
  }

  // One database lookup for the room history, shared by its field resolvers.
  public async stampAttachmentBucket(
    room: IRoom,
    messages: IMessage[] | undefined
  ): Promise<void> {
    const pending =
      messages?.filter(message => message.rawAttachments?.length) ?? [];
    if (!pending.length) return;
    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket) return;
    const documents = await this.loadDocuments(
      bucket.id,
      pending.flatMap(message => message.rawAttachments ?? [])
    );
    for (const message of pending) {
      message.storageBucketId = bucket.id;
      message.attachmentDocuments = documents;
    }
  }

  public async resolveMessageAttachments(
    message: IMessage,
    actorContext: ActorContext
  ): Promise<IMessageAttachment[]> {
    const attachments = message.rawAttachments ?? [];
    if (!attachments.length) return [];
    let bucketId = message.storageBucketId;
    if (!bucketId && message.roomID) {
      const room = await this.roomRepository.findOne({
        where: { id: message.roomID },
      });
      if (room) bucketId = (await this.getTargetBucketForRoom(room))?.id;
    }
    const documents =
      message.attachmentDocuments ??
      (bucketId
        ? await this.loadDocuments(bucketId, attachments)
        : new Map<string, IDocument>());
    return attachments.map(raw => {
      const unavailable: IMessageAttachment = {
        displayName: raw.display_name || 'attachment',
      };
      const document = bucketId
        ? this.resolveDocument(raw, bucketId, documents)
        : undefined;
      if (
        !document?.authorization ||
        !this.authorizationService.isAccessGranted(
          actorContext,
          document.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        return unavailable;
      }
      return {
        id: document.id,
        url: this.documentService.getPubliclyAccessibleURL(document),
        displayName: raw.display_name || document.displayName,
        mimeType: document.mimeType,
        size: document.size,
        width: this.imageDimension(raw.width),
        height: this.imageDimension(raw.height),
      };
    });
  }

  private async loadDocuments(
    bucketId: string,
    attachments: ReceivedAttachment[]
  ): Promise<Map<string, IDocument>> {
    const refs = [
      ...new Set(
        attachments.flatMap(raw => (raw.media_id ? [raw.media_id] : []))
      ),
    ];
    const hints = [
      ...new Set(
        attachments.flatMap(raw =>
          raw.document_id && isUUID(raw.document_id) ? [raw.document_id] : []
        )
      ),
    ];
    if (!refs.length) return new Map();
    const rows = await this.documentRepository.find({
      where: [
        {
          storageBucket: { id: In([bucketId, this.matrixMediaBucketId]) },
          externalReference: In(refs),
        },
        ...(hints.length
          ? [{ storageBucket: { id: bucketId }, id: In(hints) }]
          : []),
      ],
      relations: { storageBucket: true, authorization: true },
    });
    const documents = new Map<string, IDocument>();
    for (const document of rows) {
      documents.set(document.id, document);
      if (document.externalReference)
        documents.set(
          this.referenceKey(
            document.storageBucket.id,
            document.externalReference
          ),
          document
        );
    }
    return documents;
  }

  // A hint can reuse bytes, never authorize them or substitute different bytes.
  private resolveDocument(
    raw: ReceivedAttachment,
    bucketId: string,
    documents: Map<string, IDocument>
  ): IDocument | undefined {
    const provider = documents.get(
      this.referenceKey(this.matrixMediaBucketId, raw.media_id)
    );
    if (!provider) return undefined;
    const hint = raw.document_id ? documents.get(raw.document_id) : undefined;
    if (
      hint?.storageBucket?.id === bucketId &&
      hint.authorization &&
      hint.externalID === provider.externalID
    )
      return hint;
    const copied = documents.get(this.referenceKey(bucketId, raw.media_id));
    return copied?.authorization && copied.externalID === provider.externalID
      ? copied
      : undefined;
  }

  private referenceKey(bucketId: string, mediaId: string | undefined): string {
    return `${bucketId}:${mediaId ?? ''}`;
  }

  private imageDimension(value: number | undefined): number | undefined {
    return Number.isInteger(value) && value! > 0 && value! <= 2_147_483_647
      ? value
      : undefined;
  }

  private matchesBucketPolicy(
    bucket: IStorageBucket,
    document: IDocument
  ): boolean {
    return (
      (!bucket.allowedMimeTypes?.length ||
        bucket.allowedMimeTypes.includes(document.mimeType as MimeFileType)) &&
      (!(bucket.maxFileSize > 0) || document.size <= bucket.maxFileSize)
    );
  }

  private async getTargetBucketForRoom(
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
