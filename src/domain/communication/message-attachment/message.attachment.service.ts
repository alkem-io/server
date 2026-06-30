import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import {
  AuthorizationPolicy,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Room } from '@domain/communication/room/room.entity';
import { IRoom } from '@domain/communication/room/room.interface';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationMessageAttachment } from '@services/adapters/communication-adapter/dto/communication.message.attachment';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { MAX_MESSAGE_ATTACHMENTS } from '../conversation/conversation.media.constants';
import { IMessage } from '../message/message.interface';
import { IMessageAttachment } from './message.attachment.interface';

/**
 * Conversation media attachments (feature 013-matrix-media-file-service).
 *
 * Owns: outbound attachment resolution+validation (web compose), the EAGER
 * inbound re-home of Element-origin media (MOVE/COPY), read resolution to
 * `MessageAttachment`, and delete-release. All `file`-table writes go through
 * `FileServiceAdapter`; the bucket policy + auth live on the server.
 *
 * Gated by the `communications.message_attachments.enabled` feature flag.
 */
@Injectable()
export class MessageAttachmentService {
  private readonly enabled: boolean;
  private readonly matrixMediaBucketId: string;

  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly fileServiceAdapter: FileServiceAdapter,
    private readonly documentService: DocumentService,
    private readonly storageBucketService: StorageBucketService,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.enabled = this.configService.get(
      'communications.message_attachments.enabled',
      { infer: true }
    );
    this.matrixMediaBucketId = this.configService.get(
      'storage.file_service.matrix_media_bucket_id',
      { infer: true }
    );
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // ---------------------------------------------------------------------------
  // Outbound (web compose) — resolve + validate document ids into adapter refs.
  // ---------------------------------------------------------------------------

  /**
   * Resolve outbound attachment document ids (T007/T008). Validates count <=10,
   * that each document is in the conversation bucket and READable by the sender,
   * and that type/size satisfy the bucket policy (FR-020/022/023). Flips
   * `temporaryLocation` off so the documents are no longer swept. Returns the
   * resolved refs for the communication adapter; `[]` when the feature is off.
   */
  public async resolveOutboundAttachments(
    room: IRoom,
    actorContext: ActorContext,
    documentIds: string[] | undefined
  ): Promise<CommunicationMessageAttachment[]> {
    if (!documentIds || documentIds.length === 0) {
      return [];
    }
    if (!this.enabled) {
      throw new ValidationException(
        'Message attachments are not enabled',
        LogContext.COMMUNICATION
      );
    }
    if (documentIds.length > MAX_MESSAGE_ATTACHMENTS) {
      throw new ValidationException(
        `A message may carry at most ${MAX_MESSAGE_ATTACHMENTS} attachments`,
        LogContext.COMMUNICATION
      );
    }

    const bucket = await this.getConversationBucketForRoomOrFail(room);

    const refs: CommunicationMessageAttachment[] = [];
    for (const documentId of documentIds) {
      const document = await this.documentService.getDocumentOrFail(
        documentId,
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

      this.validateAgainstBucketPolicy(bucket, document);

      // The upload was temporaryLocation=true until send; persist it now.
      await this.fileServiceAdapter.moveDocument(document.id, {
        temporaryLocation: false,
      });

      refs.push({
        documentId: document.id,
        displayName: document.displayName,
        mimeType: document.mimeType,
        size: document.size,
        width: document.imageWidth,
        height: document.imageHeight,
      });
    }
    return refs;
  }

  // ---------------------------------------------------------------------------
  // Inbound (Element-origin) — EAGER re-home on message.received (T010/T011).
  // ---------------------------------------------------------------------------

  /**
   * Re-home inbound attachments eagerly (T010). For each Element-origin
   * attachment (carries `media_id`), resolve the canonical document globally:
   *  - still in `matrix_media` staging → MOVE into the target bucket, minting a
   *    DOCUMENT auth inheriting the target bucket's (membership) auth, setting
   *    `createdBy = sender`, and keeping `externalReference = media_id`.
   *  - already homed elsewhere (re-share) → COPY (zero-copy, shared blob) into
   *    the target bucket with its own minted auth.
   * Idempotent: a second receive/read finds the document already in the target
   * bucket and does nothing.
   *
   * Branches on room type: conversation rooms re-home into the conversation
   * bucket; comment rooms (callout/post) would re-home into the parent's
   * existing bucket — see getTargetBucketForRoom.
   */
  public async rehomeInboundAttachments(
    room: IRoom,
    senderActorID: string,
    attachments: ReceivedAttachment[] | undefined
  ): Promise<string | undefined> {
    if (!this.enabled || !attachments || attachments.length === 0) {
      return undefined;
    }

    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket) {
      return undefined; // unresolved target (logged) — leave media in staging
    }

    const inbound = attachments.filter(a => a.media_id);
    for (const attachment of inbound) {
      try {
        await this.rehomeOne(bucket, senderActorID, attachment);
      } catch (error) {
        // Never let one attachment break inbound message processing.
        this.logger.error?.(
          {
            message: 'Failed to re-home inbound attachment',
            mediaId: attachment.media_id,
            roomId: room.id,
          },
          (error as Error)?.stack,
          LogContext.COMMUNICATION
        );
      }
    }
    // Return the bucket id so callers can set message.storageBucketId for read
    // resolution of both inbound (media_id) and outbound-echo (document_id) refs.
    return bucket.id;
  }

  /** Resolve the read/resolution bucket id for a room (feature 013). */
  public async getResolutionBucketIdForRoom(
    room: IRoom
  ): Promise<string | undefined> {
    if (!this.enabled) {
      return undefined;
    }
    const bucket = await this.getTargetBucketForRoom(room);
    return bucket?.id;
  }

  /**
   * Resolve the bucket a message's attachments live in (H1). Prefers the bucket
   * id already carried on the message (set by the live-subscription path), and
   * otherwise resolves it from the message's room so attachments render on every
   * read path, not just the inbox subscription.
   */
  private async resolveMessageBucketId(
    message: IMessage
  ): Promise<string | undefined> {
    if (message.storageBucketId) {
      return message.storageBucketId;
    }
    if (!message.roomID) {
      return undefined;
    }
    const room = await this.roomRepository.findOne({
      where: { id: message.roomID },
      select: { id: true, type: true },
    });
    if (!room) {
      return undefined;
    }
    return this.getResolutionBucketIdForRoom(room as IRoom);
  }

  private async rehomeOne(
    bucket: IStorageBucket,
    senderActorID: string,
    attachment: ReceivedAttachment
  ): Promise<void> {
    const mediaId = attachment.media_id as string;

    // Idempotency: already homed in the target bucket?
    const existingInTarget =
      await this.fileServiceAdapter.getDocumentByReference(mediaId, bucket.id);
    if (existingInTarget) {
      return;
    }

    // Global lookup → the canonical document (staging or another conversation).
    const canonical =
      await this.fileServiceAdapter.getDocumentByReference(mediaId);
    if (!canonical) {
      this.logger.warn?.(
        {
          message: 'Inbound attachment media not found by reference',
          mediaId,
        },
        LogContext.COMMUNICATION
      );
      return;
    }

    const documentAuthId = await this.mintDocumentAuth(bucket);

    if (canonical.storageBucketId === this.matrixMediaBucketId) {
      // MOVE the staging row into the target bucket (T010). HEIC/unrenderable
      // verbatim staging bytes stay byte-exact for Synapse; the web-renderable
      // transcode (research D6 / T011) is handled by the COPY-with-processing
      // branch below when the source is non-renderable.
      if (this.isBrowserUnrenderable(canonical.mimeType)) {
        // M6: reuse the single auth minted above — do NOT mint again, otherwise
        // every inbound HEIC orphans an authorization_policy row.
        await this.rehomeTranscoded(
          bucket,
          senderActorID,
          canonical,
          mediaId,
          documentAuthId
        );
        return;
      }
      await this.fileServiceAdapter.moveDocument(canonical.id, {
        storageBucketId: bucket.id,
        authorizationId: documentAuthId,
        createdBy: senderActorID,
        externalReference: mediaId,
        temporaryLocation: false,
      });
    } else {
      // Re-share: same media already homed in another conversation → COPY
      // (zero-copy, shared blob) into this bucket, preserving the reference.
      await this.fileServiceAdapter.copyDocument({
        sourceId: canonical.id,
        destinationBucketId: bucket.id,
        authorizationId: documentAuthId,
        createdBy: senderActorID,
        externalReference: mediaId,
      });
    }
  }

  /**
   * Inbound HEIC / browser-unrenderable re-home (T011, research D6): read the
   * verbatim staging bytes and create a transcoded conversation document
   * (without skipImageProcessing, so file-service canonicalises), keeping the
   * `externalReference = media_id`. The verbatim staging row is then released.
   */
  private async rehomeTranscoded(
    bucket: IStorageBucket,
    senderActorID: string,
    canonical: { id: string; displayName?: string; mimeType: string },
    mediaId: string,
    documentAuthId: string
  ): Promise<void> {
    const bytes = await this.fileServiceAdapter.getDocumentContent(
      canonical.id
    );

    await this.fileServiceAdapter.createDocument(bytes, {
      displayName: canonical.displayName || 'attachment',
      mimeType: canonical.mimeType,
      storageBucketId: bucket.id,
      authorizationId: documentAuthId,
      createdBy: senderActorID,
      externalReference: mediaId,
      temporaryLocation: false,
      // NB: skipImageProcessing intentionally omitted → file-service transcodes
      // to a web-renderable canonical form.
    });

    // H3: the verbatim staging row is the provider's durable, byte-exact copy
    // (HEIC original). It stays authoritative for the global by-reference(media_id)
    // fetch Synapse relies on for read-back, while this transcoded conversation
    // doc serves the web client (bucket-scoped by-reference). It is intentionally
    // NOT reaped by the staging cleanup (see message.attachment.cleanup.service).
  }

  // ---------------------------------------------------------------------------
  // Read resolution — @ResolveField('attachments') (T012).
  // ---------------------------------------------------------------------------

  /**
   * Resolve a message's attachments to `MessageAttachment` (T012), READ-gated.
   * Outbound media is resolved by `document_id` from the event; inbound media by
   * `by-reference(bucket, media_id)`. Returns `[]` when the feature is off, when
   * the message carries no attachments, or when the resolution bucket is unknown.
   */
  public async resolveMessageAttachments(
    message: IMessage,
    actorContext: ActorContext
  ): Promise<IMessageAttachment[]> {
    if (!this.enabled || !message.rawAttachments?.length) {
      return [];
    }

    // H1: resolve the bucket on EVERY read path. The live-subscription path sets
    // message.storageBucketId, but history reads (getMessage/getMessages/
    // getLastMessages) do not — so fall back to resolving it from the message's
    // room. Without this, inbound (media_id) attachments resolve to [] on reads.
    const storageBucketId = await this.resolveMessageBucketId(message);
    if (!storageBucketId) {
      return [];
    }

    const resolved: IMessageAttachment[] = [];
    for (const raw of message.rawAttachments) {
      const document = await this.resolveAttachmentDocument(
        raw,
        storageBucketId
      );
      if (!document) {
        continue;
      }

      // READ-gate: non-members are denied (FR-007).
      if (
        !this.authorizationService.isAccessGranted(
          actorContext,
          document.authorization,
          AuthorizationPrivilege.READ
        )
      ) {
        continue;
      }

      resolved.push({
        id: document.id,
        url: this.documentService.getPubliclyAccessibleURL(document),
        displayName: document.displayName,
        mimeType: document.mimeType,
        size: document.size,
        width: document.imageWidth,
        height: document.imageHeight,
      });
    }
    return resolved;
  }

  private async resolveAttachmentDocument(
    raw: ReceivedAttachment,
    storageBucketId: string | undefined
  ): Promise<IDocument | null> {
    // Both branches require the message's bucket: the inbound branch keys the
    // by-reference lookup by it, and the outbound branch needs it to verify
    // ownership (M5). Without it we cannot safely resolve anything.
    if (!storageBucketId) {
      return null;
    }
    try {
      // Outbound echo: direct id resolution. `document_id` originates from an
      // influenceable Matrix event, so we MUST confirm the document actually
      // lives in this message's bucket before exposing it — otherwise a crafted
      // event could surface ANY document by id (confused-deputy, M5).
      if (raw.document_id) {
        const document = await this.documentService.getDocumentOrFail(
          raw.document_id,
          { relations: { authorization: true, storageBucket: true } }
        );
        if (document.storageBucket?.id !== storageBucketId) {
          this.logger.warn?.(
            {
              message:
                'Outbound attachment document_id does not belong to the message bucket; ignoring',
              documentId: raw.document_id,
              storageBucketId,
            },
            LogContext.COMMUNICATION
          );
          return null;
        }
        return document;
      }
      // Inbound: bucket-scoped by-reference → the re-homed conversation doc.
      if (raw.media_id) {
        const ref = await this.fileServiceAdapter.getDocumentByReference(
          raw.media_id,
          storageBucketId
        );
        if (!ref) {
          return null;
        }
        return await this.documentService.getDocumentOrFail(ref.id, {
          relations: { authorization: true },
        });
      }
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Unable to resolve message attachment document',
          error: (error as Error)?.message,
        },
        LogContext.COMMUNICATION
      );
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Delete-release (T015).
  // ---------------------------------------------------------------------------

  /**
   * Release the documents backing a deleted message's attachments (FR-014/015).
   * The blob is GC'd by file-service once no row references its `externalID`.
   * Outbound media is released by `document_id`; inbound by bucket-scoped
   * by-reference. Never throws into the delete flow.
   */
  public async releaseAttachments(
    rawAttachments: ReceivedAttachment[] | undefined,
    storageBucketId: string | undefined
  ): Promise<void> {
    if (!this.enabled || !rawAttachments?.length) {
      return;
    }
    for (const raw of rawAttachments) {
      const document = await this.resolveAttachmentDocument(
        raw,
        storageBucketId
      );
      if (!document) {
        continue;
      }
      try {
        await this.fileServiceAdapter.deleteDocument(document.id);
      } catch (error) {
        this.logger.error?.(
          {
            message: 'Failed to release attachment document on delete',
            documentId: document.id,
          },
          (error as Error)?.stack,
          LogContext.COMMUNICATION
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------

  private async mintDocumentAuth(bucket: IStorageBucket): Promise<string> {
    let authorization: IAuthorizationPolicy = new AuthorizationPolicy(
      AuthorizationPolicyType.DOCUMENT
    );
    authorization = this.authorizationPolicyService.inheritParentAuthorization(
      authorization,
      bucket.authorization
    );
    const saved = await this.authorizationPolicyService.save(authorization);
    return saved.id;
  }

  private validateAgainstBucketPolicy(
    bucket: IStorageBucket,
    document: IDocument
  ): void {
    if (
      bucket.allowedMimeTypes?.length &&
      !bucket.allowedMimeTypes.includes(document.mimeType)
    ) {
      throw new ValidationException(
        'Attachment type is not permitted in this conversation',
        LogContext.COMMUNICATION
      );
    }
    if (bucket.maxFileSize && document.size > bucket.maxFileSize) {
      throw new ValidationException(
        'Attachment exceeds the maximum allowed size',
        LogContext.COMMUNICATION
      );
    }
  }

  private isBrowserUnrenderable(mimeType: string): boolean {
    return mimeType === 'image/heic' || mimeType === 'image/heif';
  }

  private async getConversationBucketForRoomOrFail(
    room: IRoom
  ): Promise<IStorageBucket> {
    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket) {
      throw new ValidationException(
        'Attachments are only supported on conversation rooms',
        LogContext.COMMUNICATION
      );
    }
    return bucket;
  }

  /**
   * Resolve the storage bucket an attachment re-homes / resolves against
   * (FR-002/FR-011). Conversation rooms → the conversation's bucket. Comment
   * rooms (callout/post) → the parent callout's existing collaboration storage
   * bucket (no new bucket), where callout/post content media already lives, so
   * inbound media is accounted, authorized to that collaboration's members, and
   * renderable. Returns undefined (logged) when the target can't be resolved, so
   * the media is left in staging rather than mis-homed.
   */
  private async getTargetBucketForRoom(
    room: IRoom
  ): Promise<IStorageBucket | undefined> {
    if (this.isConversationRoom(room)) {
      const conversation = await this.conversationRepository.findOne({
        where: { room: { id: room.id } },
        relations: { storageAggregator: { directStorage: true } },
      });
      const bucketId = conversation?.storageAggregator?.directStorage?.id;
      if (!bucketId) {
        return undefined;
      }
      return this.storageBucketService.getStorageBucketOrFail(bucketId, {
        relations: { authorization: true },
      });
    }

    if (this.isCommentRoom(room)) {
      return this.getCommentRoomParentBucket(room);
    }

    this.logger.warn?.(
      {
        message:
          'Unsupported room type for attachment re-home; leaving media in staging',
        roomId: room.id,
        roomType: room.type,
      },
      LogContext.COMMUNICATION
    );
    return undefined;
  }

  /**
   * Comment-room (callout/post) re-home target (FR-002/FR-011): resolve the room
   * to its owning callout, then to that callout's collaboration storage
   * aggregator's directStorage bucket — the same membership-authorized bucket the
   * callout's own content media uses. No new bucket is created.
   */
  private async getCommentRoomParentBucket(
    room: IRoom
  ): Promise<IStorageBucket | undefined> {
    const calloutId = await this.resolveParentCalloutId(room);
    if (!calloutId) {
      this.logger.warn?.(
        {
          message:
            'Comment-room attachment: unable to resolve parent callout; leaving media in staging',
          roomId: room.id,
          roomType: room.type,
        },
        LogContext.COMMUNICATION
      );
      return undefined;
    }

    const aggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCallout(
        calloutId
      );
    const fullAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorOrFail(
        aggregator.id,
        { relations: { directStorage: { authorization: true } } }
      );
    return fullAggregator.directStorage ?? undefined;
  }

  /** Resolve a comment room (callout or post) to its owning callout id. */
  private async resolveParentCalloutId(
    room: IRoom
  ): Promise<string | undefined> {
    const manager = this.conversationRepository.manager;
    if (room.type === RoomType.CALLOUT) {
      const callout = await manager.findOne(Callout, {
        where: { comments: { id: room.id } },
        select: { id: true },
      });
      return callout?.id;
    }
    if (room.type === RoomType.POST) {
      const post = await manager.findOne(Post, {
        where: { comments: { id: room.id } },
        relations: { contribution: { callout: true } },
      });
      return post?.contribution?.callout?.id;
    }
    return undefined;
  }

  private isConversationRoom(room: IRoom): boolean {
    return (
      room.type === RoomType.CONVERSATION ||
      room.type === RoomType.CONVERSATION_DIRECT ||
      room.type === RoomType.CONVERSATION_GROUP
    );
  }

  private isCommentRoom(room: IRoom): boolean {
    return room.type === RoomType.CALLOUT || room.type === RoomType.POST;
  }
}
