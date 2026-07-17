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
import { isConversationRoom } from '@domain/communication/room/room.utils';
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
  /**
   * FIX [1]: in-process single-flight for inbound re-homes, keyed by
   * `${bucketId}:${media_id}`. rehomeOne is check-then-act, and it now runs from
   * BOTH the eager `rehomeInboundAttachments` path AND the lazy read path
   * (`resolveAttachmentDocument`). Two concurrent viewers that both miss the
   * by-reference lookup would otherwise both re-home the same media: the MOVE
   * branch orphans one minted authorization_policy (last-write-wins), and the COPY
   * branch creates TWO rows sharing one externalReference (file-service has NO
   * unique constraint on (bucket, externalReference) in prod). Coalescing collapses
   * concurrent callers to a single placement.
   *
   * Residual: single-flight is PER-PROCESS. Multiple server pods can still race the
   * same media (rare — only when the eager re-home already failed AND two pods read
   * the same message simultaneously). The MOVE branch is naturally idempotent on the
   * same staging row; a cross-pod COPY duplicate needs file-service-side
   * reconciliation and is an accepted residual (not solved here).
   */
  private readonly rehomeInFlight = new Map<string, Promise<void>>();

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
   * Resolve + VALIDATE outbound attachment document ids (T007/T008), WITHOUT
   * mutating anything. Validates count <=10, that each document is in the
   * conversation bucket, is owned by the sender, is READable by the sender, and
   * that type/size satisfy the bucket policy (FR-020/022/023). Returns the
   * resolved refs for the communication adapter; `[]` when the feature is off.
   *
   * Pinning (`temporaryLocation=false`) is deliberately NOT done here — it is
   * deferred to `persistOutboundAttachments`, called only AFTER the message send
   * is confirmed. If validation passes but a later attachment or the send itself
   * throws, no document is pinned, so the staged uploads are swept normally by
   * the 24h staging cleanup instead of being permanently retained (FR-024).
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
        'A message carries more than the maximum number of attachments',
        LogContext.COMMUNICATION,
        { max: MAX_MESSAGE_ATTACHMENTS, count: documentIds.length }
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

      // Outbound must match the read/delete invariant (isOwnedBySender): a sender
      // may only attach their OWN uploads. Without this a member could attach
      // another member's staged upload — the send would succeed and permanently
      // pin that document, yet it would resolve to nothing on every read (the
      // read path requires createdBy === sender). Fail-closed on an unknown
      // sender so a missing actor never matches a document with a null owner.
      if (
        !actorContext.actorID ||
        document.createdBy !== actorContext.actorID
      ) {
        throw new ValidationException(
          'Attachment is not owned by the sender',
          LogContext.COMMUNICATION
        );
      }

      // Single-use invariant (FIX 1): a legitimate outbound attachment is always
      // a FRESH, unsent upload — the web client uploads a NEW temporary document
      // per attachment (temporaryLocation === true). A durable (already-sent)
      // document means it was consumed by a prior send; re-attaching it would let
      // the SAME document id back two separate messages, so deleting one message
      // would call deleteDocument(D) and destroy the other message's only file
      // row (cross-message delete-release destruction). Reject durable docs to
      // enforce single-use.
      if (document.temporaryLocation !== true) {
        throw new ValidationException(
          'Attachment has already been sent',
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

  /**
   * Pin outbound attachments as durable AFTER the message send is confirmed
   * (FR-024). Flips `temporaryLocation` off for every resolved attachment so the
   * staging sweep no longer reaps them. MUST be called only once
   * `sendMessage`/`sendMessageReply` has succeeded — a failed send must never
   * pin, so no durable orphans.
   *
   * This is the FAST PATH and is best-effort per document: a transient failure
   * is logged, never thrown into the post-send path (the message has already
   * been delivered). A missed flip here is retried by two delivery-fact-anchored
   * pin points (full-gate [0]):
   *  1. the ECHO-ANCHORED pin — when the message's own delivery echo arrives on
   *     the retried MQ channel, `coalesceOutboundEcho` pins the doc durable;
   *  2. the OUTBOUND READ-HEAL — any read that resolves a delivered message's
   *     still-temporary doc pins it (see resolveAttachmentDocument).
   * The 24h staging sweep can therefore only reap a DELIVERED attachment if all
   * three pins fail AND the conversation goes unread for 24h — a compound
   * fault, accepted as the documented residual.
   */
  public async persistOutboundAttachments(
    attachments: CommunicationMessageAttachment[] | undefined
  ): Promise<void> {
    if (!this.enabled || !attachments || attachments.length === 0) {
      return;
    }
    await Promise.all(
      attachments.map(attachment =>
        this.fileServiceAdapter
          .moveDocument(attachment.documentId, { temporaryLocation: false })
          .catch(error => {
            this.logger.error?.(
              {
                message:
                  'Failed to pin outbound attachment durable after send; it will be swept from staging',
                documentId: attachment.documentId,
              },
              (error as Error)?.stack,
              LogContext.COMMUNICATION
            );
          })
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Inbound (Element-origin) — EAGER re-home on message.received (T010/T011).
  // ---------------------------------------------------------------------------

  /**
   * Re-home / coalesce a received message's media eagerly on `message.received`
   * (T010), so reads are plain lookups. Each attachment is one of two kinds:
   *
   *  - OUTBOUND echo (carries `document_id`) — the conversation doc D already
   *    exists (created at web upload). The echo is delivery proof, so D is
   *    pinned durable if still temporary — regardless of `media_id` presence
   *    (full-gate [0], see coalesceOutboundEcho). When the echo also carries
   *    the Synapse `media_id`, COALESCE: stamp `externalReference = media_id`
   *    onto D and delete the redundant `matrix_media` staging twin D′ the
   *    provider minted for the same blob (see coalesceOutboundEcho). No
   *    re-home — D is already homed. Without a surfaced `media_id` the twin
   *    cannot be located (cross-repo: see the note on coalesceOutboundEcho),
   *    but the delivery-pin still runs.
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

    // Bucket resolution is wrapped too: getTargetBucketForRoom throws for
    // callout/comment rooms (getStorageAggregatorForCallout/OrFail) and can
    // throw on a transiently-unresolvable conversation bucket. This method is
    // called on the inbound message.received path, which does NOT wrap it — so
    // an unhandled throw here would skip publish/notifications/VC invocation for
    // the whole message. Never let attachment re-home break inbound processing:
    // log best-effort and return undefined. Media then stays in the matrix_media
    // staging bucket; the read path self-heals by LAZILY re-homing on the first
    // read that misses the bucket-scoped lookup (see resolveAttachmentDocument),
    // so a transient re-home failure no longer makes the attachment permanently
    // invisible.
    let bucket: IStorageBucket | undefined;
    try {
      bucket = await this.getTargetBucketForRoom(room);
    } catch (error) {
      this.logger.error?.(
        {
          message:
            'Failed to resolve target bucket for inbound attachment re-home; leaving media in staging',
          roomId: room.id,
          roomType: room.type,
        },
        (error as Error)?.stack,
        LogContext.COMMUNICATION
      );
      return undefined;
    }
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
          // FIX [1]: single-flight so this eager re-home can't race a concurrent
          // lazy read re-home (see resolveAttachmentDocument) on the same media.
          await this.rehomeOnceCoalesced(bucket, senderActorID, attachment);
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
   * Delivery-pin (full-gate [0]): the echo is Synapse's proof the message was
   * delivered, so this ALSO pins D durable (`temporaryLocation: false`) when it
   * is still temporary — REGARDLESS of `media_id` presence — folding the flip
   * into the stamp PATCH when one runs, or issuing it standalone otherwise.
   * This is the primary retry anchor for a transiently-failed
   * `persistOutboundAttachments` flip: without it the 24h staging sweep would
   * reap a delivered message's attachment. The pin is gated behind the same
   * confused-deputy guards (bucket membership + sender ownership) so a forged
   * `document_id` can never pin someone else's document.
   *
   * Idempotent: re-delivery/re-read finds D already stamped (and durable) and
   * D′ already gone, and does nothing.
   *
   * Cross-repo note: the coalesce requires matrix-adapter to surface BOTH
   * `io.alkemio.document_id` AND the `media_id` (from the event `url`/`mxc`) on
   * outbound echoes. While the adapter still clears `media_id` on echoes, the
   * twin cleanup is a safe no-op (the twin remains until the adapter slice
   * lands) — the delivery-pin above still runs.
   */
  private async coalesceOutboundEcho(
    bucket: IStorageBucket,
    senderActorID: string,
    attachment: ReceivedAttachment
  ): Promise<void> {
    const documentId = attachment.document_id as string;
    const mediaId = attachment.media_id;

    // Confused-deputy guard (HIGH): BOTH `document_id` and `media_id` are taken
    // verbatim from an attacker-influenceable Matrix event. Before stamping a
    // reference onto D (or pinning it durable below) we require (a) D lives in
    // this room's bucket AND (b) the SENDER OWNS D. Without the ownership gate a
    // member could forge an `m.image` pointing at another member's re-homed
    // document D plus an arbitrary `media_id`, and the stamp below would
    // overwrite D's `externalReference` — making that document unresolvable
    // by-reference conversation-wide (the attachment would silently disappear
    // for everyone). The guards run BEFORE the `!mediaId` branch so the
    // delivery-pin fires regardless of `media_id` presence, but never for a
    // forged `document_id`.
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

    // Echo-anchored durable pin (full-gate [0]): this echo IS Synapse's proof
    // that the message carrying D was delivered. If D is still temporary, the
    // inline post-send flip (persistOutboundAttachments) must have failed
    // transiently — pin it durable here so the 24h staging sweep cannot reap a
    // DELIVERED message's attachment. The echo arrives on the retried MQ
    // channel, making this the primary retry anchor for that flip.
    const needsPin = document.temporaryLocation === true;

    if (!mediaId) {
      // No staging media id surfaced on this echo → cannot locate the twin, so
      // no coalesce work is possible — but the delivery-pin still applies.
      if (needsPin) {
        await this.fileServiceAdapter.moveDocument(documentId, {
          temporaryLocation: false,
        });
      }
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
      // Fold the delivery-pin into the stamp PATCH — one call flips both when D
      // is still temporary.
      const patch: { externalReference: string; temporaryLocation?: boolean } =
        { externalReference: mediaId };
      if (needsPin) {
        patch.temporaryLocation = false;
      }
      await this.fileServiceAdapter.moveDocument(documentId, patch);
    } else if (needsPin) {
      // Already stamped to D on a prior delivery, but D is STILL temporary —
      // the earlier pin attempt(s) failed. Issue the standalone pin.
      await this.fileServiceAdapter.moveDocument(documentId, {
        temporaryLocation: false,
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
   * Resolve the storage bucket a message's attachments live in (H1 + FIX 6 + FIX
   * [4]). Returns `{ id, bucket? }`:
   *  - FAST PATH (live subscription, `message.storageBucketId` set): returns the id
   *    ONLY, with NO `getStorageBucketOrFail` call — zero queries. The common read
   *    cases never need the full bucket (outbound-echo id resolution, inbound-hit
   *    by-reference, READ-gate via `document.authorization`); the full bucket is
   *    loaded LAZILY inside resolveAttachmentDocument, only when the RARE lazy
   *    inbound re-home actually needs `bucket.authorization`.
   *  - HISTORY PATH (no `storageBucketId`): resolves the room → the FULL bucket
   *    (with `authorization`, already joined by getTargetBucketForRoom per FIX 6) →
   *    returns `{ id, bucket }` so the lazy re-home reuses it without a re-query.
   * Returns undefined when the room/bucket can't be resolved.
   */
  private async resolveMessageBucket(
    message: IMessage
  ): Promise<{ id: string; bucket?: IStorageBucket } | undefined> {
    // FIX B: attachment resolution must NEVER break message reads. The history path
    // (resolveMessageAttachments → here → getTargetBucketForRoom) can throw
    // transiently (storage-aggregator / bucket lookups). An unguarded throw would
    // propagate out of the @ResolveField and fail the ENTIRE getMessages/
    // getLastMessages query for the viewer. Degrade to "bucket unknown" (undefined)
    // → resolveMessageAttachments omits this message's attachments while the history
    // query still succeeds. Same invariant as FIX 2.
    try {
      // Fast path: id already carried on the message → no query, no full bucket.
      if (message.storageBucketId) {
        return { id: message.storageBucketId };
      }
      // History path: resolve the room → full bucket, then thread it through.
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
      const bucket = await this.getTargetBucketForRoom(room as IRoom);
      if (!bucket) {
        return undefined;
      }
      return { id: bucket.id, bucket };
    } catch {
      this.logger.warn?.(
        {
          message:
            'Failed to resolve attachment bucket on read; omitting attachments for this message',
          roomId: message.roomID,
          messageId: message.id,
        },
        LogContext.COMMUNICATION
      );
      return undefined;
    }
  }

  /**
   * FIX [1]: single-flight wrapper around rehomeOne, keyed by
   * `${bucket.id}:${media_id}`. If a re-home for that key is already in flight,
   * return its promise so concurrent callers (eager + lazy read) share ONE
   * placement; otherwise start it, register it, and clear the entry once it settles
   * (so a later re-home can retry after a failure). The shared promise's rejection
   * propagates to every awaiter — each caller's own try/catch handles it.
   */
  private rehomeOnceCoalesced(
    bucket: IStorageBucket,
    senderActorID: string,
    attachment: ReceivedAttachment
  ): Promise<void> {
    const key = `${bucket.id}:${attachment.media_id}`;
    const inFlight = this.rehomeInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }
    const promise = this.rehomeOne(bucket, senderActorID, attachment).finally(
      () => {
        this.rehomeInFlight.delete(key);
      }
    );
    this.rehomeInFlight.set(key, promise);
    return promise;
  }

  private async rehomeOne(
    bucket: IStorageBucket,
    senderActorID: string,
    attachment: ReceivedAttachment
  ): Promise<void> {
    const mediaId = attachment.media_id as string;

    // Idempotency: already homed in the target bucket? Plain early-return — a
    // document already present in the target bucket is DURABLE (the MOVE flips
    // temporaryLocation:false in its atomic PATCH; the file-service copy is born
    // durable, see below), so there is nothing to heal. A second receive of the
    // same media_id simply does nothing.
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

    // The auth-owning try covers the atomic placement unit (the MOVE, or the COPY
    // that creates the row + points it at documentAuthId). On failure the minted-
    // but-unused auth is cleaned up. Both placements land the document DURABLE in
    // ONE call — no separate follow-up pin exists.
    try {
      if (canonical.storageBucketId === this.matrixMediaBucketId) {
        // MOVE the verbatim staging row into the target bucket (T010) — uniform
        // for EVERY media type. HEIC/unrenderable media is moved byte-exact too;
        // file-service serves a web-renderable rendition at read time (serve-time
        // transcode), so the server no longer mints a separate transcoded doc.
        // Result: one verbatim document per media_id, a single auth mint, no
        // two-rows-same-reference. This is a SINGLE atomic PATCH that flips the
        // genuinely-temporary staging doc durable (temporaryLocation:false); a
        // failure leaves the staging row untouched and the minted auth unused, so
        // the catch cleanup is correct.
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
        // The file-service copy contract materializes the new row DURABLE in one
        // call (CopyDocument hardcodes temporaryLocation:false via the outbox-aware
        // writeCreate, and auto-backs-up the blob), so NO follow-up pin is needed.
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
    // FIX [4]: on the fast path resolveMessageBucket returns only the id
    // (query-free); the full bucket is loaded LAZILY inside
    // resolveAttachmentDocument, and ONLY when a rare inbound re-home needs it.
    const resolved = await this.resolveMessageBucket(message);
    if (!resolved) {
      return [];
    }

    // Resolve the message's attachments in parallel — each is an independent
    // document lookup (+ file-service round-trip for inbound refs); awaiting them
    // sequentially serialised the round-trips on every history read. Promise.all
    // preserves order, so the resolved attachments keep their original sequence.
    //
    // FIX 2 (fault isolation): attachment resolution must NEVER fail the whole
    // getMessages/getLastMessages query. Each item's resolution is guarded so a
    // single throw (e.g. a malformed auth relation reaching isAccessGranted) omits
    // ONLY that attachment instead of rejecting the batch. FIX 3 (observability):
    // a swallowed failure is logged at warn with roomId + messageId so a
    // persistent resolution defect surfaces in monitoring rather than silently
    // presenting as "no attachments".
    const resolvedAttachments = await Promise.all(
      message.rawAttachments.map(raw =>
        this.resolveReadAttachment(
          raw,
          resolved.id,
          resolved.bucket,
          message.sender,
          actorContext
        ).catch(error => {
          this.logger.warn?.(
            {
              message:
                'Failed to resolve a message attachment on read; omitting it',
              roomId: message.roomID,
              messageId: message.id,
              error: (error as Error)?.message,
            },
            LogContext.COMMUNICATION
          );
          return null;
        })
      )
    );
    return resolvedAttachments.filter(
      (attachment): attachment is IMessageAttachment => attachment !== null
    );
  }

  /**
   * Resolve a single raw attachment for read (T012): document resolution +
   * ownership gate (via resolveAttachmentDocument) followed by the READ-gate.
   * Returns null when the document cannot be resolved or the viewer cannot read
   * it, so the caller drops it from the resolved set.
   */
  private async resolveReadAttachment(
    raw: ReceivedAttachment,
    bucketId: string,
    bucketForRehome: IStorageBucket | undefined,
    senderActorID: string | undefined,
    actorContext: ActorContext
  ): Promise<IMessageAttachment | null> {
    // Read path passes `allowHeal:true` so the outbound heal + the lazy inbound
    // re-home run ONLY here, never on delete. On the fast path `bucketForRehome` is
    // undefined and the full bucket is lazy-loaded inside resolveAttachmentDocument
    // only if an inbound miss actually needs a re-home; on the history path the
    // full bucket is already resolved and threaded through to skip that query.
    const document = await this.resolveAttachmentDocument(
      raw,
      bucketId,
      senderActorID,
      { allowHeal: true, bucketForRehome }
    );
    if (!document) {
      return null;
    }

    // READ-gate: non-members are denied (FR-007).
    if (
      !this.authorizationService.isAccessGranted(
        actorContext,
        document.authorization,
        AuthorizationPrivilege.READ
      )
    ) {
      return null;
    }

    return {
      id: document.id,
      url: this.documentService.getPubliclyAccessibleURL(document),
      displayName: document.displayName,
      mimeType: document.mimeType,
      size: document.size,
      width: document.imageWidth,
      height: document.imageHeight,
    };
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
    senderActorID: string | undefined,
    // FIX [0]/[4]: the outbound heal and the lazy inbound re-home run on the READ
    // path ONLY, gated by `allowHeal`. The delete path (releaseAttachments) uses the
    // default `allowHeal:false`, so releasing never pins a still-temporary doc
    // durable (which would strand it durable+orphaned past a transiently-failed
    // delete, beyond the 24h sweep's reach) and never re-homes. `bucketForRehome` is
    // the pre-resolved full bucket (history path); when absent (fast path) the bucket
    // is loaded LAZILY below, and ONLY when an inbound re-home is actually needed.
    opts: { allowHeal: boolean; bucketForRehome?: IStorageBucket } = {
      allowHeal: false,
    }
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
        // Outbound read-heal (full-gate [0], secondary anchor): this document
        // backs an EXISTING — therefore delivered — message, so observing it
        // still temporary is proof both the inline post-send flip AND the
        // echo-anchored pin failed. Heal it now so the 24h staging sweep cannot
        // reap a delivered attachment. Gated on `allowHeal` (READ path ONLY): on the
        // delete path this must NOT fire — pinning a still-temporary doc durable
        // right before deleteDocument would, if the delete then fails transiently,
        // leave the doc durable+orphaned and unreachable by the 24h sweep. Best-
        // effort: a pin failure is logged and must NEVER fail (or block) the read.
        if (opts.allowHeal && document.temporaryLocation === true) {
          try {
            await this.fileServiceAdapter.moveDocument(document.id, {
              temporaryLocation: false,
            });
          } catch (error) {
            this.logger.warn?.(
              {
                message:
                  'Failed to pin delivered outbound attachment durable on read; will retry on the next read',
                documentId: document.id,
                storageBucketId,
                error: (error as Error)?.message,
              },
              LogContext.COMMUNICATION
            );
          }
        }
        return document;
      }
      // Inbound: bucket-scoped by-reference → the re-homed conversation doc.
      // `media_id` is attacker-influenceable too, so the same ownership gate
      // applies: the re-home stamped `createdBy = sender`, so a forged media_id
      // pointing at another member's re-homed doc fails the gate.
      if (raw.media_id) {
        let ref = await this.fileServiceAdapter.getDocumentByReference(
          raw.media_id,
          storageBucketId
        );
        if (!ref) {
          // FIX 2 (self-heal): the eager inbound re-home may have failed
          // transiently, leaving the media in the matrix_media staging bucket
          // where this bucket-scoped lookup can't see it — permanent invisibility
          // before this fix. Lazily re-home now (READ path ONLY, gated by
          // `allowHeal`), then re-run the lookup. rehomeOne is idempotent and needs
          // the sender to attribute the doc (createdBy + auth mint), so skip when
          // unattributable. Best-effort: if file-service is still down the re-home
          // throws (or still misses) and we return null AS BEFORE — the next read
          // retries and heals.
          if (!opts.allowHeal || !senderActorID) {
            return null;
          }
          // FIX [4]: load the full bucket LAZILY. The fast read path carries only
          // the bucket id, so pay the getStorageBucketOrFail query + auth join ONLY
          // here, when an inbound re-home is actually needed (mintDocumentAuth needs
          // bucket.authorization). The history path pre-resolves it and threads it
          // through as bucketForRehome, avoiding the extra round-trip.
          const rehomeBucket =
            opts.bucketForRehome ??
            (await this.storageBucketService.getStorageBucketOrFail(
              storageBucketId,
              { relations: { authorization: true } }
            ));
          try {
            // FIX [1]: coalesce concurrent re-homes of the SAME media so two
            // simultaneous readers don't both MOVE/COPY it (orphaned auth /
            // duplicate doc).
            await this.rehomeOnceCoalesced(rehomeBucket, senderActorID, raw);
          } catch (error) {
            this.logger.warn?.(
              {
                message:
                  'Lazy inbound re-home failed on read; media stays in staging and will retry on the next read',
                mediaId: raw.media_id,
                storageBucketId,
                error: (error as Error)?.message,
              },
              LogContext.COMMUNICATION
            );
            return null;
          }
          ref = await this.fileServiceAdapter.getDocumentByReference(
            raw.media_id,
            storageBucketId
          );
          if (!ref) {
            return null;
          }
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
        senderActorID,
        // Delete path: no outbound heal, no inbound re-home. Healing here would pin
        // a still-temporary doc durable right before deleteDocument — a transient
        // delete failure would then strand it durable+orphaned, beyond the sweep.
        { allowHeal: false }
      );
      if (!document) {
        continue;
      }
      try {
        // FIX 5: route through the CANONICAL delete path so the server-owned
        // authorization_policy (minted by mintDocumentAuth for inbound docs / by
        // the upload path for composer uploads) and tagset rows are cleaned up
        // from the DeleteDocumentResult — a direct fileServiceAdapter.deleteDocument
        // discards that result and leaks both rows.
        await this.documentService.deleteDocument({ ID: document.id });
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
    // An empty / unset allowedMimeTypes list means "no explicit MIME allow-list"
    // → no type restriction (platform convention). A non-empty list is enforced
    // as an allow-list. Conversation buckets always carry a curated non-empty
    // list, so in practice this branch always enforces.
    if (
      bucket.allowedMimeTypes?.length &&
      !bucket.allowedMimeTypes.includes(document.mimeType)
    ) {
      throw new ValidationException(
        'Attachment type is not permitted in this conversation',
        LogContext.COMMUNICATION
      );
    }
    // maxFileSize === 0 (or unset) means "no explicit size limit" (platform
    // convention, matching how other buckets treat 0). Only a positive cap is
    // enforced — the truthiness check `bucket.maxFileSize && …` would have
    // skipped enforcement identically, but be explicit so the intent is clear.
    if (bucket.maxFileSize > 0 && document.size > bucket.maxFileSize) {
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
    if (isConversationRoom(room)) {
      // FIX 6: join the bucket's authorization in this single conversation query
      // and return directStorage directly, instead of resolving the bucket id here
      // and issuing a SECOND getStorageBucketOrFail round-trip for the same bucket.
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

  private isCommentRoom(room: IRoom): boolean {
    return room.type === RoomType.CALLOUT || room.type === RoomType.POST;
  }
}
