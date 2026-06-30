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
   * Re-home / coalesce a received message's media eagerly on `message.received`
   * (T010), so reads are plain lookups. Each attachment is one of two kinds:
   *
   *  - OUTBOUND echo (carries `document_id`) — the conversation doc D already
   *    exists (created at web upload). When the echo also carries the Synapse
   *    `media_id`, COALESCE: stamp `externalReference = media_id` onto D and
   *    delete the redundant `matrix_media` staging twin D′ the provider minted
   *    for the same blob (see coalesceOutboundEcho). No re-home — D is already
   *    homed. Without a surfaced `media_id` this is a no-op (cross-repo: see the
   *    note on coalesceOutboundEcho).
   *
   *  - INBOUND (Element-origin, carries `media_id` only) — resolve the canonical
   *    document globally and re-home into the target bucket:
   *      • still in `matrix_media` staging → MOVE (uniform for every type),
   *        minting a DOCUMENT auth inheriting the target bucket's (membership)
   *        auth, setting `createdBy = sender`, keeping `externalReference`.
   *      • already homed elsewhere (re-share) → COPY (zero-copy, shared blob).
   *    Idempotent: a second receive finds the document already in the target
   *    bucket and does nothing.
   *
   * Branches on room type: conversation rooms target the conversation bucket;
   * comment rooms (callout/post) target the parent's existing bucket — see
   * getTargetBucketForRoom.
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

    for (const attachment of attachments) {
      try {
        if (attachment.document_id) {
          // Outbound echo: D already exists — coalesce away the staging twin.
          await this.coalesceOutboundEcho(bucket, senderActorID, attachment);
        } else if (attachment.media_id) {
          // Inbound Element-origin media → verbatim MOVE / re-share COPY.
          await this.rehomeOne(bucket, senderActorID, attachment);
        }
      } catch (error) {
        // Never let one attachment break inbound message processing.
        this.logger.error?.(
          {
            message: 'Failed to re-home/coalesce message attachment',
            mediaId: attachment.media_id,
            documentId: attachment.document_id,
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

  /**
   * Outbound coalesce (feature 013). For a WEB-originated attachment the
   * conversation doc D already exists (created at web upload, `externalReference`
   * null). When matrix-adapter pushes its bytes to Synapse, the media-storage
   * provider mints a SECOND `matrix_media` staging row D′ keyed by
   * `externalReference = media_id`, sharing D's content-addressed blob. Re-home
   * is skipped for outbound (the echo carries `document_id`), so D′ would be
   * stranded — pinning the blob past message delete. This coalesces the twin:
   *
   *  1. stamp `externalReference = media_id` onto D (so by-reference(media_id)
   *     resolves to the conversation doc, not the staging twin), and
   *  2. delete the redundant `matrix_media` staging row D′ — the shared blob
   *     survives because D still references it.
   *
   * Idempotent: re-delivery/re-read finds D already stamped and D′ already gone,
   * and does nothing.
   *
   * Cross-repo note: this requires matrix-adapter to surface BOTH
   * `io.alkemio.document_id` AND the `media_id` (from the event `url`/`mxc`) on
   * outbound echoes. While the adapter still clears `media_id` on echoes, this is
   * a safe no-op (the twin remains until the adapter slice lands) — never an
   * error.
   */
  private async coalesceOutboundEcho(
    bucket: IStorageBucket,
    senderActorID: string,
    attachment: ReceivedAttachment
  ): Promise<void> {
    const documentId = attachment.document_id as string;
    const mediaId = attachment.media_id;
    if (!mediaId) {
      // No staging media id surfaced on this echo → cannot locate the twin.
      return;
    }

    // Confused-deputy guard (HIGH): BOTH `document_id` and `media_id` are taken
    // verbatim from an attacker-influenceable Matrix event. Before stamping a
    // reference onto D we require (a) D lives in this room's bucket AND (b) the
    // SENDER OWNS D. Without the ownership gate a member could forge an `m.image`
    // pointing at another member's re-homed document D plus an arbitrary
    // `media_id`, and the stamp below would overwrite D's `externalReference` —
    // making that document unresolvable by-reference conversation-wide (the
    // attachment would silently disappear for everyone).
    const document = await this.documentService.getDocumentOrFail(documentId, {
      relations: { storageBucket: true },
    });
    if (document.storageBucket?.id !== bucket.id) {
      this.logger.warn?.(
        {
          message:
            'Outbound echo document_id does not belong to the room bucket; skipping coalesce',
          documentId,
          mediaId,
          bucketId: bucket.id,
        },
        LogContext.COMMUNICATION
      );
      return;
    }
    if (document.createdBy !== senderActorID) {
      this.logger.warn?.(
        {
          message:
            'Outbound echo document_id is not owned by the sender; skipping coalesce',
          documentId,
          mediaId,
        },
        LogContext.COMMUNICATION
      );
      return;
    }

    // No-overwrite invariant (MEDIUM): D must not already carry a DIFFERENT
    // externalReference. The bucket-scoped slot lookup below only proves the new
    // `media_id` is free in this bucket — it does NOT prove D itself is
    // unreferenced. If D already references mediaY and a fresh mediaZ slot is
    // free, the stamp would overwrite mediaY → mediaZ, detaching the earlier
    // message (its by-reference(mediaY) resolves to nothing). The server
    // Document entity now maps the file-service-owned `externalReference` column
    // read-only, so D's current reference is on the entity we just loaded — no
    // extra round-trip. `=== mediaId` is a no-op (idempotent re-delivery) and
    // falls through to the slot lookup, which also short-circuits the re-stamp.
    if (document.externalReference && document.externalReference !== mediaId) {
      this.logger.warn?.(
        {
          message:
            'Outbound echo document already carries a different externalReference; skipping coalesce',
          documentId,
          existingReference: document.externalReference,
          mediaId,
        },
        LogContext.COMMUNICATION
      );
      return;
    }

    // (1) Idempotent stamp, driven off the bucket-scoped by-reference lookup.
    // The D-side no-overwrite check above guarantees D is unreferenced (or
    // already references exactly mediaId). This second, media-id-side lookup
    // guards the COMPLEMENTARY case — mediaId already bound to a DIFFERENT doc in
    // this bucket — so we never steal a reference another document already holds:
    //   • resolves to D            → already stamped: no-op (still clean the twin)
    //   • resolves to another doc  → media id already bound here: never steal it
    //   • resolves to nothing      → reference slot free: safe to stamp D
    const referenced = await this.fileServiceAdapter.getDocumentByReference(
      mediaId,
      bucket.id
    );
    if (referenced && referenced.id !== documentId) {
      this.logger.warn?.(
        {
          message:
            'Outbound echo media_id already resolves to a different document in this bucket; skipping coalesce',
          documentId,
          referencedId: referenced.id,
          mediaId,
          bucketId: bucket.id,
        },
        LogContext.COMMUNICATION
      );
      return;
    }
    if (!referenced) {
      await this.fileServiceAdapter.moveDocument(documentId, {
        externalReference: mediaId,
      });
    }

    // (2) Delete the redundant matrix_media staging twin D′ (shares D's blob,
    // which survives because D now references it). Scoped to the matrix_media
    // bucket so we never touch D itself (now also carrying the reference).
    const twin = await this.fileServiceAdapter.getDocumentByReference(
      mediaId,
      this.matrixMediaBucketId
    );
    if (twin && twin.storageBucketId === this.matrixMediaBucketId) {
      await this.fileServiceAdapter.deleteDocument(twin.id);
    }
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

    try {
      if (canonical.storageBucketId === this.matrixMediaBucketId) {
        // MOVE the verbatim staging row into the target bucket (T010) — uniform
        // for EVERY media type. HEIC/unrenderable media is moved byte-exact too;
        // file-service serves a web-renderable rendition at read time (serve-time
        // transcode), so the server no longer mints a separate transcoded doc.
        // Result: one verbatim document per media_id, a single auth mint, no
        // two-rows-same-reference.
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
        // `skipDedup: true` is the reference-bearing contract: file-service keys
        // such rows by `externalReference`, not by content, so two distinct
        // media_ids with identical bytes each get their own row instead of
        // collapsing and dropping the second one's reference.
        await this.fileServiceAdapter.copyDocument({
          sourceId: canonical.id,
          destinationBucketId: bucket.id,
          authorizationId: documentAuthId,
          createdBy: senderActorID,
          externalReference: mediaId,
          skipDedup: true,
        });
      }
    } catch (error) {
      // The auth policy is minted before placement; on a failed MOVE/COPY clean
      // it up so a stranded DOCUMENT policy row does not leak (best-effort —
      // never mask the original placement error).
      await this.authorizationPolicyService
        .deleteById(documentAuthId)
        .catch(() => undefined);
      throw error;
    }
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
        storageBucketId,
        message.sender
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

  /**
   * Confused-deputy / attribution-spoof guard (feature 013, security). Both
   * `document_id` and `media_id` on a `ReceivedAttachment` come from an
   * attacker-influenceable Matrix event. A message's *legitimate* attachments
   * always carry `createdBy` = that message's sender — set server-side at web
   * upload (outbound) and at inbound re-home (`createdBy: senderActorID`). So a
   * resolved document is only genuinely THIS message's attachment when it is
   * owned by the message's sender. Fail-closed: an unknown sender never matches,
   * so we never resolve (and never delete) a document we cannot attribute.
   */
  private isOwnedBySender(
    document: IDocument,
    senderActorID: string | undefined
  ): boolean {
    return !!senderActorID && document.createdBy === senderActorID;
  }

  private async resolveAttachmentDocument(
    raw: ReceivedAttachment,
    storageBucketId: string | undefined,
    senderActorID: string | undefined
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
      // lives in this message's bucket AND is owned by the message's sender
      // before exposing/releasing it — otherwise a crafted event could surface
      // or delete ANY document in the bucket by id (confused-deputy, M5 +
      // delete-release HIGH).
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
        if (!this.isOwnedBySender(document, senderActorID)) {
          this.logger.warn?.(
            {
              message:
                'Outbound attachment document_id is not owned by the message sender; ignoring',
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
      // `media_id` is attacker-influenceable too, so the same ownership gate
      // applies: the re-home stamped `createdBy = sender`, so a forged media_id
      // pointing at another member's re-homed doc fails the gate.
      if (raw.media_id) {
        const ref = await this.fileServiceAdapter.getDocumentByReference(
          raw.media_id,
          storageBucketId
        );
        if (!ref) {
          return null;
        }
        const document = await this.documentService.getDocumentOrFail(ref.id, {
          relations: { authorization: true },
        });
        if (!this.isOwnedBySender(document, senderActorID)) {
          this.logger.warn?.(
            {
              message:
                'Inbound attachment media_id resolves to a document not owned by the message sender; ignoring',
              mediaId: raw.media_id,
              storageBucketId,
            },
            LogContext.COMMUNICATION
          );
          return null;
        }
        return document;
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
   *
   * SECURITY (delete-release confused-deputy, HIGH): the resolution is gated on
   * `document.createdBy === senderActorID` (the deleting message's sender) via
   * `resolveAttachmentDocument`. Without it a member could forge an `m.image`
   * carrying another member's `document_id` from the same bucket and delete
   * their own message to release someone else's document. `senderActorID` is the
   * sender of the message being deleted.
   */
  public async releaseAttachments(
    rawAttachments: ReceivedAttachment[] | undefined,
    storageBucketId: string | undefined,
    senderActorID: string | undefined
  ): Promise<void> {
    if (!this.enabled || !rawAttachments?.length) {
      return;
    }
    for (const raw of rawAttachments) {
      const document = await this.resolveAttachmentDocument(
        raw,
        storageBucketId,
        senderActorID
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
