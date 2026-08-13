import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { MimeFileType } from '@common/enums/mime.file.type';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import type { MessageAttachmentDimsLoader } from '@core/dataloader/creators/loader.creators';
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
import type { DocumentReferenceResult } from '@services/adapters/file-service-adapter/dto';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { MAX_MESSAGE_ATTACHMENTS } from '../conversation/conversation.media.constants';
import { IMessage } from '../message/message.interface';
import { IMessageAttachment } from './message.attachment.interface';

/**
 * file-service's `displayName` contract on `PATCH /internal/file/:id`, mirrored
 * here (see sanitizeAttachmentDisplayName). The cap is measured in UTF-8 BYTES,
 * NOT UTF-16 code units.
 */
const DISPLAY_NAME_MAX_BYTES = 512;

/**
 * Truncate to at most `maxBytes` UTF-8 bytes WITHOUT splitting a multi-byte
 * character: walk the cut point back off any UTF-8 continuation byte
 * (`0b10xxxxxx`), which would otherwise decode to a U+FFFD replacement char.
 */
const clampToUtf8Bytes = (value: string, maxBytes: number): string => {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.byteLength <= maxBytes) {
    return value;
  }
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end--;
  }
  return bytes.subarray(0, end).toString('utf8');
};

/**
 * Sanitize a Matrix event's human filename (`ReceivedAttachment.display_name`,
 * i.e. the event `body`) into something file-service will ACCEPT (feature 013).
 *
 * WHY THIS IS NOT OPTIONAL: `display_name` is attacker-influenceable — it comes
 * verbatim off a Matrix event any room member (or any federated homeserver) can
 * craft. file-service validates `displayName` on PATCH (non-empty /
 * non-whitespace, <= 512 BYTES, no path separators `/` or `\`, no control
 * characters < 0x20 or DEL) and REJECTS the whole request otherwise. The
 * inbound re-home sends `displayName` on the SAME atomic PATCH as
 * `authorizationId` / `createdBy` / `externalReference`, so an unsanitized
 * crafted filename would fail the entire re-home and leave the attachment
 * permanently invisible — a trivially-triggered denial of service. Sanitizing
 * server-side keeps the re-home unconditionally well-formed.
 *
 * Rules (deliberately mirroring file-service's, nothing more):
 *  - control characters (C0 `< 0x20` and DEL `0x7f`) are DROPPED;
 *  - path separators `/` and `\` are REPLACED with `_` (keeps the name
 *    readable rather than silently gluing segments together);
 *  - the result is trimmed, then clamped to 512 UTF-8 BYTES on a character
 *    boundary, then trimmed again (a clamp can expose trailing whitespace);
 *  - if nothing survives (empty / whitespace-only / control-only input) we fall
 *    back to `fallback` — the existing staging name, i.e. the Synapse media id.
 *
 * Iteration is by CODE POINT (`for..of`) so astral characters (emoji, CJK
 * extension planes) are never split into lone surrogates.
 */
export const sanitizeAttachmentDisplayName = (
  displayName: string | undefined | null,
  fallback: string
): string => {
  if (typeof displayName !== 'string') {
    return fallback;
  }
  let cleaned = '';
  for (const character of displayName) {
    const code = character.codePointAt(0) as number;
    if (code < 0x20 || code === 0x7f) {
      continue; // C0 control character or DEL — rejected by file-service
    }
    cleaned += character === '/' || character === '\\' ? '_' : character;
  }
  const clamped = clampToUtf8Bytes(
    cleaned.trim(),
    DISPLAY_NAME_MAX_BYTES
  ).trim();
  return clamped.length > 0 ? clamped : fallback;
};

/**
 * Anything in this feature that may carry intrinsic image dimensions. The two
 * sides of the boundary name the SAME two numbers differently: file-service
 * shapes (`Document`, `DocumentReferenceResult`) use `imageWidth`/`imageHeight`,
 * the Matrix/wire shapes (`ReceivedAttachment`, `CommunicationMessageAttachment`,
 * `IMessageAttachment`) use `width`/`height`. `applyImageDims` reads both.
 */
interface ImageDimsSource {
  width?: number;
  height?: number;
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * The outcome of read-path document resolution.
 */
interface ResolvedAttachmentDocument {
  document: IDocument;
}

/**
 * Inbound (`media_id`) documents for ONE message, pre-resolved in a single
 * server-side query and keyed by `externalReference` (C1). `undefined` means
 * "the batch lookup itself failed" — distinct from an empty map, which means
 * "looked up, nothing re-homed yet" and legitimately triggers the lazy re-home.
 */
type InboundDocumentsByReference = Map<string, IDocument> | undefined;

/**
 * Conversation media attachments (feature 013-matrix-media-file-service).
 *
 * Owns: outbound attachment resolution+validation (web compose), the EAGER
 * inbound re-home of Element-origin media (MOVE/COPY), and read resolution to
 * `MessageAttachment`. All `file`-table writes go through `FileServiceAdapter`;
 * the bucket policy + auth live on the server.
 *
 * This feature is a TIERED CLIENT of Synapse, not a replacement: media DELETION
 * and blob lifecycle are Synapse's job (message deletion is per-event redaction;
 * Synapse retention/purge governs the blob), so the server does NOT release or
 * GC attachment media when a message is deleted.
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
    private readonly roomResolverService: RoomResolverService,
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

    const bucket = await this.getAttachmentBucketForRoomOrFail(room);

    // FIX [1]: load every attachment document in PARALLEL, preserving
    // documentIds ORDER and the original sequential loop's per-position error
    // precedence. These are independent DB round-trips (each joining
    // authorization + storageBucket); awaiting them one-by-one inside the
    // validation loop serialised up to MAX_MESSAGE_ATTACHMENTS (<=10) fetches on
    // the hot send path. `Promise.allSettled` issues all loads concurrently while
    // (unlike `Promise.all`, which rejects on the FIRST load failure regardless
    // of position) letting the SECOND pass below decide which error surfaces: it
    // walks the settled results IN ORDER (index 0..n) and, for each position,
    // either re-throws that position's LOAD failure or runs the CPU-only
    // VALIDATION chain on the loaded doc. So position i's error (load OR
    // validation) always surfaces before position i+1's — reproducing the old
    // sequential (load-then-validate, in order) semantics exactly, with every
    // validation guard/message unchanged. settled[i] corresponds to documentIds[i].
    const settled = await Promise.allSettled(
      documentIds.map(documentId =>
        this.documentService.getDocumentOrFail(documentId, {
          relations: { authorization: true, storageBucket: true },
        })
      )
    );

    const refs: CommunicationMessageAttachment[] = [];
    // Image refs whose dims are fetched AFTER validation, in ONE batch (below).
    // Each entry references its ref object (built in documentIds order) so the
    // dims pass mutates dims in place without disturbing ref ORDER.
    const imageRefs: CommunicationMessageAttachment[] = [];
    for (const outcome of settled) {
      // Ordered pass: surface position i's LOAD error at its position (e.g. a
      // not-found id), matching the old sequential loop that would have thrown
      // there before reaching any later position.
      if (outcome.status === 'rejected') {
        throw outcome.reason;
      }
      const document = outcome.value;
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

      const ref: CommunicationMessageAttachment = {
        documentId: document.id,
        displayName: document.displayName,
        mimeType: document.mimeType,
        size: document.size,
      };
      refs.push(ref);
      if (document.mimeType?.startsWith('image/')) {
        imageRefs.push(ref);
      }
    }

    // Outbound image dimensions ([4], completes both directions): imageWidth/
    // imageHeight are TRANSIENT, file-service-owned fields (content_metadata) —
    // the getDocumentOrFail DB loads above leave them undefined on the server
    // entities, so we source them from file-service's meta endpoint. This lets
    // Alkemio-composed images reach matrix-adapter with intrinsic dimensions
    // (the m.image event's info.w/h; clients render without layout reflow).
    //
    // ONE batched round-trip for every image on the message, AFTER validation.
    // A by-id meta GET per image billed file-service up to
    // MAX_MESSAGE_ATTACHMENTS (<= 10) requests per send; issuing them in parallel
    // kept the added latency to one timeout but not the request count.
    // `/meta-batch` makes it one request AND one timeout. The call is
    // BEST-EFFORT and DELIBERATELY ISOLATED from the shared file-service circuit
    // breaker — short timeout, zero retries, no breaker accounting — so a
    // degraded `/meta-batch` can never fast-fail the uploads and pins that
    // breaker guards; it already degrades to an empty map internally. The
    // try/catch here is defence-in-depth — and catches a SYNCHRONOUS throw, which
    // `.catch()` alone would not — so a meta failure just leaves width/height
    // undefined and never fails (or blocks) the send.
    //
    // Each ref takes its OWN measurement, looked up BY DOCUMENT ID: `/meta-batch`
    // answers a partial and UNORDERED `files` array, so positional matching would
    // silently mis-assign dims between attachments.
    if (imageRefs.length > 0) {
      try {
        const metaById = await this.fileServiceAdapter.getDocumentMetaBatch(
          imageRefs.map(ref => ref.documentId)
        );
        for (const ref of imageRefs) {
          this.applyImageDims(ref, metaById.get(ref.documentId));
        }
      } catch {
        // Dims omitted; the send proceeds. Refs keep their input ORDER either
        // way — this pass only mutates in place.
      }
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
          // The eager path already holds the full `bucket`, so its thunk just runs
          // rehomeOne directly.
          await this.rehomeOnceCoalesced(bucket.id, attachment.media_id, () =>
            this.rehomeOne(bucket, senderActorID, attachment)
          );
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
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to resolve attachment bucket on read; omitting attachments for this message',
          roomId: message.roomID,
          messageId: message.id,
          error: (error as Error)?.message,
        },
        LogContext.COMMUNICATION
      );
      return undefined;
    }
  }

  /**
   * Resolve a room's attachment bucket ONCE for a whole batch of messages and
   * stamp it onto each of them (C2).
   *
   * WHY: `CommunicationAdapter.convertMessageDtoToIMessage` sets only `roomID`,
   * never `storageBucketId`, so on every history read each message individually
   * fell into `resolveMessageBucket`'s slow branch — a room lookup PLUS a
   * conversation/callout + storage-aggregator resolution, PER MESSAGE. Since
   * `getMessages(room)` is unpaginated, a single room open fanned that chain out
   * once per message carrying attachments. All those lookups resolve the SAME
   * room to the SAME bucket, so resolve it once here and let every message take
   * `resolveMessageBucket`'s zero-query fast path.
   *
   * Called from the ONE place a room's whole message list materializes for
   * GraphQL (`RoomResolverFields.messages`). Never throws and never mutates a
   * message that already carries a `storageBucketId` (the live-subscription path
   * sets it from the eager re-home): attachment resolution must never be able to
   * break a message read, so an unresolvable bucket simply leaves the messages
   * as they were and each one degrades exactly as before.
   */
  public async stampAttachmentBucket(
    room: IRoom,
    messages: IMessage[] | undefined
  ): Promise<void> {
    if (!this.enabled || !messages?.length) {
      return;
    }
    const pending = messages.filter(
      message => !message.storageBucketId && message.rawAttachments?.length
    );
    if (pending.length === 0) {
      return;
    }
    let bucket: IStorageBucket | undefined;
    try {
      bucket = await this.getTargetBucketForRoom(room);
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to resolve the attachment bucket for a message batch; falling back to per-message resolution',
          roomId: room.id,
          roomType: room.type,
          error: (error as Error)?.message,
        },
        LogContext.COMMUNICATION
      );
      return;
    }
    if (!bucket) {
      return;
    }
    for (const message of pending) {
      message.storageBucketId = bucket.id;
    }
  }

  /**
   * FIX [1]: single-flight coalescer for the inbound re-home WRITE, keyed by
   * `${bucketId}:${mediaId}`. If a re-home for that key is already in flight,
   * return its promise (NO `startRehome` call). Otherwise invoke the `startRehome`
   * thunk — which runs the single rehomeOne placement — register it, and clear the
   * entry once it settles (so a later re-home can retry after a failure).
   * Concurrent callers (eager + lazy read) thus share ONE placement (preventing the
   * duplicate mint+MOVE / COPY); the shared promise's rejection propagates to every
   * awaiter — each caller's own try/catch handles it.
   *
   * Only the WRITE is coalesced. The read-only bucket load stays PER-READER at the
   * caller (fault isolation) — the thunk closes over an already-resolved bucket and
   * never loads one itself. Folding the load into this shared thunk was tried and
   * caused a read-path regression: the winning reader's transient bucket-load
   * failure cascaded to every coalesced reader. See the lazy call site in
   * resolveAttachmentDocument.
   *
   * Residual: single-flight is PER-PROCESS (see rehomeInFlight above).
   */
  private rehomeOnceCoalesced(
    bucketId: string,
    mediaId: string,
    startRehome: () => Promise<void>
  ): Promise<void> {
    const key = `${bucketId}:${mediaId}`;
    const inFlight = this.rehomeInFlight.get(key);
    if (inFlight) {
      return inFlight;
    }
    const promise = startRehome().finally(() => {
      this.rehomeInFlight.delete(key);
    });
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

    // FR-022 (D1): inbound media must satisfy the TARGET bucket's curated policy
    // too. Without this the allow-list and 50 MiB cap only ever guarded the
    // outbound (web compose) path, so anything Element could push through Synapse
    // — a 2 GiB video, an `application/x-msdownload`, any MIME outside the
    // MimeFileType enum — was re-homed into the conversation bucket unchecked. A
    // non-enum MIME additionally breaks the bucket's `documents` GraphQL query for
    // everyone (`Document.mimeType` is a `MimeType!` enum field).
    //
    // FAILURE MODE — decline the re-home, do NOT throw and do NOT delete anything:
    //  * the media stays in the `matrix_media` staging bucket, exactly as it does
    //    for any other unresolvable re-home. Synapse still owns and serves it, so
    //    Element users are unaffected — this is a "not admitted into Alkemio
    //    storage" decision, not a deletion (media lifecycle is Synapse's job);
    //  * the read path's bucket-scoped lookup then simply misses, so the web
    //    client omits THAT attachment while the rest of the message renders. A bad
    //    MIME can never break the read of the whole message;
    //  * returning (rather than throwing) also keeps the eager path's per-
    //    attachment catch quiet for what is an expected policy outcome, not a
    //    fault. It is logged at WARN with the media id, MIME, size and bucket so
    //    rejections are observable.
    //
    // NOTE (out of server scope): the `matrix_media` STAGING bucket's own policy
    // is not enforced here — that row is created directly by the Synapse
    // media-storage provider against file-service, which the server does not
    // mediate.
    const violation = this.checkAgainstBucketPolicy(bucket, canonical);
    if (violation) {
      this.logger.warn?.(
        {
          message:
            'Inbound attachment rejected by the target bucket policy; leaving media in staging',
          violation,
          mediaId,
          mimeType: canonical.mimeType,
          size: canonical.size,
          bucketId: bucket.id,
        },
        LogContext.COMMUNICATION
      );
      return;
    }

    const documentAuthId = await this.mintDocumentAuth(bucket);

    // Human filename (Element <-> web parity). The Synapse media-storage provider
    // runs BELOW the Matrix event layer: the only identifier it has when it
    // mints the staging row is the opaque `media_id`, so every staging document
    // is named e.g. `zQtvVFbLNbcuMwYqRLWCWNfR` with no extension. The event
    // `body` — the real filename the sender chose — reaches us here as
    // `attachment.display_name`, so the re-home is the FIRST (and only) point
    // that can restore it. Without this an Element-sent `holiday.jpg` shows in
    // the web client as the raw media id and downloads as an extension-less,
    // unopenable file. SANITIZED because `display_name` is attacker-
    // influenceable and file-service hard-rejects a malformed name — which,
    // riding this same atomic PATCH, would fail the whole re-home (see
    // sanitizeAttachmentDisplayName).
    const displayName = sanitizeAttachmentDisplayName(
      attachment.display_name,
      mediaId
    );

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
        //
        // TODO(013): the re-homed row keeps the staging row's EMPTY tagsetId —
        // `UpdateDocumentInput` has no `tagsetId` field and the server never
        // writes the `file` table directly, so no tagset can be attached here.
        // `Document.tagset` is `Tagset!` in schema.graphql, so a query selecting
        // it on these rows would fail; nothing selects it today (latent).
        // ACCEPTED + documented limitation, not a defect — see
        // docs/conversation-media-attachments.md, "Known limitations" (1).
        await this.fileServiceAdapter.moveDocument(canonical.id, {
          storageBucketId: bucket.id,
          authorizationId: documentAuthId,
          createdBy: senderActorID,
          externalReference: mediaId,
          // Restore the human filename over the provider's media-id placeholder.
          displayName,
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
        //
        // TODO(013): the re-shared copy INHERITS the source row's displayName —
        // for a re-share of still-staged Element media that is the opaque
        // `media_id`, not the human filename, so this branch loses the
        // Element<->web filename parity the MOVE branch above restores.
        // `CopyDocumentInput` has no `displayName` field yet; adding one is a
        // file-service change (`POST /internal/file/copy`). Once it exists, pass
        // the same sanitized `displayName` here. Deliberately NOT worked around
        // with a follow-up PATCH round-trip: that would make the placement
        // non-atomic (a partial failure would leave a copied-but-misnamed row)
        // for a cosmetic field. ACCEPTED + documented limitation, not a defect —
        // see docs/conversation-media-attachments.md, "Known limitations" (2).
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
   *
   * `dimsLoader` is the REQUEST-scoped image-dimensions loader supplied by
   * `MessageResolverFields.attachments`. It collapses the authoritative dims
   * fetch to ONE `getDocumentMetaBatch` call for the WHOLE request instead of one
   * per message — see applyReadImageDims. It is optional so that a caller outside
   * a GraphQL request (or a test) still resolves attachments correctly, just with
   * a per-message batch.
   */
  public async resolveMessageAttachments(
    message: IMessage,
    actorContext: ActorContext,
    dimsLoader?: MessageAttachmentDimsLoader
  ): Promise<IMessageAttachment[]> {
    // Register with the request's dims batch SYNCHRONOUSLY, before the first
    // await: graphql-js invokes every message's `attachments` resolver in one
    // turn, so this is what lets the loader know how many messages it must wait
    // for. Released below (and, as a safety net, in the `finally`).
    const settleDimsBatch = dimsLoader?.beginMessage();
    try {
      return await this.resolveMessageAttachmentsGated(
        message,
        actorContext,
        dimsLoader,
        settleDimsBatch
      );
    } finally {
      // Idempotent: a no-op when the gated pass already released. Covers every
      // early return and any throw, so a message can never stall the batch.
      settleDimsBatch?.();
    }
  }

  private async resolveMessageAttachmentsGated(
    message: IMessage,
    actorContext: ActorContext,
    dimsLoader: MessageAttachmentDimsLoader | undefined,
    settleDimsBatch: (() => void) | undefined
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

    // C1: resolve EVERY inbound (media_id) attachment of this message in ONE
    // server-side query, BEFORE the per-attachment fan-out below.
    const inboundDocuments = await this.loadInboundDocuments(
      resolved.id,
      message
    );

    // Resolve the message's attachments in parallel — each is an independent
    // document lookup; awaiting them sequentially serialised the round-trips on
    // every history read. Promise.all preserves order, so the resolved
    // attachments keep their original sequence.
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
          actorContext,
          inboundDocuments
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
    const attachments = resolvedAttachments.filter(
      (attachment): attachment is IMessageAttachment => attachment !== null
    );

    // Authoritative image dimensions, LAST — after every per-attachment READ
    // gate has run, so a denied attachment costs nothing. See applyReadImageDims.
    //
    // Release this message's hold on the request-wide dims batch FIRST: the
    // batch waits for every registered message to reach this point, so a message
    // that awaited its own loads before releasing would wait on itself forever.
    settleDimsBatch?.();
    await this.applyReadImageDims(attachments, dimsLoader);

    return attachments;
  }

  /**
   * Batch-resolve a message's INBOUND (`media_id`) attachment documents in ONE
   * server-side query (C1).
   *
   * WHY: `Message.attachments` is a `@ResolveField` and `getMessages(room)`
   * returns a room's ENTIRE history unpaginated, so the previous per-attachment
   * `fileServiceAdapter.getDocumentByReference(media_id, bucketId)` fanned out
   * once PER ATTACHMENT PER VIEWER PER PAGE LOAD. Unlike the best-effort dims
   * fetch (`getDocumentMetaBatch`), which deliberately bypasses the breaker, that
   * call IS accounted against the SHARED file-service circuit breaker — so a
   * normal chat load in a media-heavy room could trip the breaker that guards
   * uploads and pins for the WHOLE platform. `(externalReference,
   * storageBucketId)` is a partially-unique indexed pair on the same database,
   * so the server can resolve every reference itself, exactly, in one query —
   * and the read path then makes NO breaker-accounted file-service call at all
   * on the hit path.
   *
   * Returns `undefined` when the batch itself failed (logged) — the caller then
   * omits inbound attachments for this message rather than mistaking the failure
   * for "not re-homed yet" and kicking off a pointless re-home. That keeps the
   * same never-fail-the-query degradation as an unresolvable bucket.
   */
  private async loadInboundDocuments(
    bucketId: string,
    message: IMessage
  ): Promise<InboundDocumentsByReference> {
    const mediaIds = [
      ...new Set(
        (message.rawAttachments ?? [])
          .filter(raw => !raw.document_id && raw.media_id)
          .map(raw => raw.media_id as string)
      ),
    ];
    if (mediaIds.length === 0) {
      return new Map();
    }
    try {
      const documents =
        await this.documentService.getDocumentsByReferencesInBucket(
          bucketId,
          mediaIds
        );
      return new Map(
        documents
          .filter(document => !!document.externalReference)
          .map(document => [document.externalReference as string, document])
      );
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to batch-resolve inbound attachment documents on read; omitting inbound attachments for this message',
          roomId: message.roomID,
          messageId: message.id,
          storageBucketId: bucketId,
          error: (error as Error)?.message,
        },
        LogContext.COMMUNICATION
      );
      return undefined;
    }
  }

  /**
   * Resolve a single raw attachment for read (T012): document resolution +
   * ownership gate (via resolveAttachmentDocument), then the READ-gate, and ONLY
   * THEN the event-asserted image dimensions. Returns null when the document
   * cannot be resolved or the viewer cannot read it, so the caller drops it from
   * the resolved set — and the caller's batched, authoritative dims pass
   * (applyReadImageDims) therefore never sees it, so an attachment the viewer
   * cannot read costs no dimension work at all.
   */
  private async resolveReadAttachment(
    raw: ReceivedAttachment,
    bucketId: string,
    bucketForRehome: IStorageBucket | undefined,
    senderActorID: string | undefined,
    actorContext: ActorContext,
    inboundDocuments: InboundDocumentsByReference
  ): Promise<IMessageAttachment | null> {
    // resolveAttachmentDocument is a READ-path helper: the outbound heal and the
    // lazy inbound re-home always run. On the fast path `bucketForRehome` is
    // undefined and the full bucket is lazy-loaded inside resolveAttachmentDocument
    // only if an inbound miss actually needs a re-home; on the history path the
    // full bucket is already resolved and threaded through to skip that query.
    const resolved = await this.resolveAttachmentDocument(
      raw,
      bucketId,
      senderActorID,
      inboundDocuments,
      bucketForRehome
    );
    if (!resolved) {
      return null;
    }
    const { document } = resolved;

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

    const attachment: IMessageAttachment = {
      id: document.id,
      url: this.documentService.getPubliclyAccessibleURL(document),
      displayName: document.displayName,
      mimeType: document.mimeType,
      size: document.size,
      // Explicitly present (rather than omitted) so the shape is stable whether
      // or not dims resolve below.
      width: undefined,
      height: undefined,
    };

    // Event-asserted dims (`info.w`/`info.h`) — the LOWER-precedence source, and
    // the only one already in hand. Applied HERE (after the READ gate, still
    // inside the per-attachment guard) so the authoritative file-service
    // measurement can OVERWRITE it in the batched second pass that runs once the
    // whole message has been gated. See applyReadImageDims.
    this.applyImageDims(attachment, raw);

    return attachment;
  }

  /**
   * Overlay file-service's OWN MEASUREMENT of the stored bytes onto a message's
   * already-gated attachments.
   *
   * PRECEDENCE (highest first) — `applyImageDims` OVERWRITES, so the sources are
   * applied lowest-first and this method runs LAST:
   *  1. **file-service measurement** (`imageWidth`/`imageHeight` from
   *     `getDocumentMetaBatch`) — applied HERE, and therefore final. file-service
   *     measured the bytes it stores; nobody can assert it.
   *  2. **event-asserted `info.w`/`info.h`** (`ReceivedAttachment.width`/`height`)
   *     — applied earlier, in resolveReadAttachment, so a measurement overwrites
   *     it and its absence leaves the event value standing. It is CLIENT-ASSERTED
   *     and UNVERIFIED (Synapse does not check it either), so it is a fallback,
   *     never the authority.
   *  3. nothing — the attachment stays dimensionless.
   * A non-positive/non-finite value from EITHER source counts as ABSENT (C4), so
   * an `info.w: 0` can neither stick nor mask a real measurement.
   *
   * WHY IT IS BATCHED, AND HOW FAR. `Message.attachments` is a `@ResolveField`
   * and `roomService.getMessages(room)` returns a room's ENTIRE history
   * unpaginated, so anything issued per attachment — or per message — fans out
   * once PER VIEWER PER PAGE LOAD. Two collapses, in order:
   *  - per ATTACHMENT → per MESSAGE: one `getDocumentMetaBatch` for the whole
   *    message instead of one by-id meta GET per dimensionless image (which is
   *    why the authoritative source had previously been demoted below the
   *    event's);
   *  - per MESSAGE → per REQUEST: with a `dimsLoader` supplied (the GraphQL read
   *    path always supplies one) the ids are handed to the REQUEST-scoped
   *    DataLoader, which coalesces every message's ids into a SINGLE
   *    `getDocumentMetaBatch` call for the whole read. See
   *    `createMessageAttachmentDimsLoader` for how dispatch is barriered so the
   *    coalescing survives the messages reaching this point at different times.
   * Without a loader (a non-GraphQL caller) the direct per-message batch is kept
   * as the fallback. Either way the call BYPASSES the shared file-service circuit
   * breaker (short timeout, zero retries, no breaker accounting), so a degraded
   * `/meta-batch` can never fast-fail the uploads and pins the breaker protects;
   * and the adapter chunks at 100 ids, so a history whose gated images exceed
   * that degrades into several bounded requests rather than a 400.
   *
   * Called from resolveMessageAttachments AFTER every per-attachment READ gate,
   * so a denied attachment is not in `attachments` and costs NOTHING — not even
   * a loader key, which is what keeps the request-wide batch free of ids the
   * viewer may not read. Non-image attachments are excluded, so a message with no
   * images asks for nothing at all.
   *
   * Best-effort: dims are a cosmetic rendering hint (they avoid layout reflow),
   * so EVERY failure degrades to "the event dims, or nothing" and must never fail
   * — or block — the read. try/catch rather than `.catch(() => undefined)` so a
   * SYNCHRONOUS throw is caught too: unlike its per-attachment predecessor this
   * runs OUTSIDE the per-attachment guard, so an escaping throw would fail the
   * non-nullable `Message.attachments` field for the whole message. On the loader
   * path a rejected batch surfaces as an `Error` VALUE per key (`loadMany` never
   * rejects), which is read as "no measurement" for exactly the same reason.
   */
  private async applyReadImageDims(
    attachments: IMessageAttachment[],
    dimsLoader?: MessageAttachmentDimsLoader
  ): Promise<void> {
    const imageAttachments = attachments.filter(attachment =>
      attachment.mimeType?.startsWith('image/')
    );
    if (imageAttachments.length === 0) {
      return; // only images carry dims — no round-trip
    }
    const documentIds = imageAttachments.map(attachment => attachment.id);
    // Positional ONLY against `documentIds` — both branches below resolve the
    // measurement by document ID, never by the order file-service answered in
    // (`/meta-batch` returns a partial, unordered `files` array).
    let measurements: (DocumentReferenceResult | null)[];
    try {
      measurements = dimsLoader
        ? await this.loadImageDimsViaLoader(dimsLoader, documentIds)
        : await this.loadImageDimsDirect(documentIds);
    } catch {
      return; // best-effort — never fail (or block) a read
    }
    imageAttachments.forEach((attachment, index) => {
      // A `null` is a NORMAL partial result (file-service has no measurement for
      // that id): applyImageDims no-ops on it, leaving the event-asserted dims —
      // or nothing — in place.
      this.applyImageDims(attachment, measurements[index]);
    });
  }

  /**
   * Request-wide path: hand the ids to the per-request DataLoader, which
   * coalesces them with every other message's into ONE `getDocumentMetaBatch`.
   * `loadMany` resolves errors as VALUES rather than rejecting, so one bad batch
   * degrades to "no measurement" instead of throwing into the read.
   */
  private async loadImageDimsViaLoader(
    dimsLoader: MessageAttachmentDimsLoader,
    documentIds: string[]
  ): Promise<(DocumentReferenceResult | null)[]> {
    const results = await dimsLoader.loadMany(documentIds);
    return results.map(result => (result instanceof Error ? null : result));
  }

  /** Fallback path (no request loader): one batch for this message's ids. */
  private async loadImageDimsDirect(
    documentIds: string[]
  ): Promise<(DocumentReferenceResult | null)[]> {
    const metaById =
      await this.fileServiceAdapter.getDocumentMetaBatch(documentIds);
    return documentIds.map(documentId => metaById.get(documentId) ?? null);
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

  /**
   * The ONE place "transfer intrinsic image dimensions from a source onto a
   * target" lives. This idiom used to be open-coded at three sites (outbound
   * send ref, inbound by-reference carry-over, outbound read) with subtly
   * different guards and field names; a single helper means a future dims
   * source — or a change to the never-clobber rule — is one edit.
   *
   * Reads EITHER naming (`width`/`height` or `imageWidth`/`imageHeight`, see
   * ImageDimsSource) and NEVER writes an absent value over a value already
   * present, so it is safe to layer lowest-precedence-source-first.
   *
   * A NON-POSITIVE dimension counts as ABSENT (C4). A zero pixel count is not a
   * real dimension — no image is 0 wide — it is what an unmeasured/unknown
   * source reports. Treating `0` as "present" would overwrite a genuine
   * dimension already applied by a lower-precedence source, and (in the earlier
   * `dims already in hand?` short-circuit) also suppressed the authoritative
   * file-service measurement entirely. Negative/NaN values are rejected on the
   * same grounds. This matters most for inbound media, whose `info.w`/`info.h`
   * are asserted by the sending client and may be 0 or missing.
   */
  private applyImageDims(
    target: { width?: number; height?: number },
    source: ImageDimsSource | null | undefined
  ): void {
    const width = this.firstPositiveDim(source?.width, source?.imageWidth);
    const height = this.firstPositiveDim(source?.height, source?.imageHeight);
    if (width !== undefined) {
      target.width = width;
    }
    if (height !== undefined) {
      target.height = height;
    }
  }

  /**
   * First usable pixel dimension among the candidates: finite and > 0. Anything
   * else (undefined, 0, negative, NaN) is "no dimension" — see applyImageDims.
   * Checked across BOTH namings so a `width: 0` never masks a valid
   * `imageWidth`.
   */
  private firstPositiveDim(
    ...candidates: (number | undefined)[]
  ): number | undefined {
    return candidates.find(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
    );
  }

  private async resolveAttachmentDocument(
    raw: ReceivedAttachment,
    storageBucketId: string | undefined,
    senderActorID: string | undefined,
    // C1: this message's inbound (media_id) documents, pre-resolved in ONE
    // server-side query by loadInboundDocuments. `undefined` = that batch failed.
    inboundDocuments: InboundDocumentsByReference,
    // FIX [0]/[4]: this is a READ-path helper — its only caller is the read
    // resolution path (resolveReadAttachment), so the outbound heal and the lazy
    // inbound re-home always run. `bucketForRehome` is the pre-resolved full bucket
    // (history path); when absent (fast path) the bucket is loaded LAZILY below,
    // and ONLY when an inbound re-home is actually needed.
    bucketForRehome?: IStorageBucket
  ): Promise<ResolvedAttachmentDocument | null> {
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
        // reap a delivered attachment. This is a READ-path operation (the only
        // caller is the read resolution path). Best-effort: a pin failure is
        // logged and must NEVER fail (or block) the read.
        if (document.temporaryLocation === true) {
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
        // Dims are NOT resolved here. This branch has no dims in hand (the
        // getDocumentOrFail DB load leaves the TRANSIENT, file-service-owned
        // imageWidth/imageHeight undefined), and the only remaining source is a
        // network round-trip — which must not run before the READ gate. The
        // event's dims are applied after that gate in resolveReadAttachment, and
        // the authoritative measurement in the batched applyReadImageDims pass.
        return { document };
      }
      // Inbound: bucket-scoped by-reference → the re-homed conversation doc.
      // Resolved from the PRE-BATCHED map (C1) — one server-side query for the
      // whole message instead of one breaker-accounted file-service round-trip
      // per attachment. See loadInboundDocuments.
      if (raw.media_id) {
        if (!inboundDocuments) {
          // The batch lookup itself failed (already logged). Do NOT fall through
          // to the miss branch: that would mistake an infrastructure failure for
          // "not re-homed yet" and kick off a pointless re-home write.
          return null;
        }
        let document = inboundDocuments.get(raw.media_id);
        if (!document) {
          // FIX 2 (self-heal): the eager inbound re-home may have failed
          // transiently, leaving the media in the matrix_media staging bucket
          // where this bucket-scoped lookup can't see it — permanent invisibility
          // before this fix. Lazily re-home now (READ path), then re-run the
          // lookup. rehomeOne is idempotent and needs the sender to attribute the
          // doc (createdBy + auth mint), so skip when unattributable. Best-effort:
          // if file-service is still down the re-home throws (or still misses) and
          // we return null AS BEFORE — the next read retries and heals.
          if (!senderActorID) {
            return null;
          }
          try {
            // Load the bucket PER-READER, BEFORE the coalescer. The bucket load
            // is a read-only op and is intentionally NOT folded into the shared
            // single-flight thunk: doing so (tried in a prior round) removed
            // per-reader fault isolation — a transient bucket-load failure for the
            // WINNING reader (DB timeout / pool exhaustion) then propagated to
            // every coalesced reader, so multiple viewers momentarily saw the
            // attachment missing (self-heals next read, but a read-path
            // regression). Keeping the load per-reader means one reader's
            // transient load failure never cascades to concurrent readers. On the
            // history path the pre-resolved bucket is threaded through as
            // bucketForRehome, avoiding the round-trip entirely.
            const rehomeBucket =
              bucketForRehome ??
              (await this.storageBucketService.getStorageBucketOrFail(
                storageBucketId,
                { relations: { authorization: true } }
              ));
            // FIX [1]: coalesce only the re-home WRITE so two simultaneous readers
            // don't both MOVE/COPY the same media (orphaned auth on MOVE /
            // duplicate doc on COPY) — the thunk closes over the already-resolved
            // `rehomeBucket` and does NOT load the bucket itself. The redundant
            // bucket load when two readers concurrently hit the same
            // not-yet-re-homed media is the accepted, cheap cost of that
            // fault isolation (this path is already rare — it only runs when the
            // eager re-home failed).
            await this.rehomeOnceCoalesced(storageBucketId, raw.media_id, () =>
              this.rehomeOne(rehomeBucket, senderActorID, raw)
            );
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
          // Re-resolve the ONE media id we just re-homed — still a server-side
          // query (file-service writes the same `file` table), so the self-heal
          // costs no breaker-accounted call either.
          [document] =
            await this.documentService.getDocumentsByReferencesInBucket(
              storageBucketId,
              [raw.media_id]
            );
          if (!document) {
            return null;
          }
        }
        // Confused-deputy gate, INBOUND variant (C3). `media_id` comes verbatim
        // off an attacker-influenceable Matrix event, so a gate is required — but
        // it must NOT be sender-ownership.
        //
        // WHY NOT OWNERSHIP: `(bucket, externalReference)` is UNIQUE, so a media
        // id maps to exactly ONE document per bucket. When a SECOND member
        // legitimately re-shares media already in this conversation, rehomeOne
        // finds it homed and no-ops — the row keeps the FIRST sharer's
        // `createdBy`, so the second sender could never satisfy an ownership
        // check and their attachment was dropped from every read, FOREVER. That
        // also diverged from Element/Synapse, where any member may reference any
        // `mxc://` URI they know and the message renders — re-sharing/forwarding
        // media is ordinary Matrix behaviour, not an attack.
        //
        // WHAT THE GATE IS INSTEAD: the document must be DURABLE. That is the
        // property with actual confidentiality value — a `temporaryLocation`
        // document is somebody's UNSENT, still-staged upload, and surfacing one
        // via a crafted event would disclose content its uploader never shared
        // (the same exposure A3 closes on the bucket listing). Everything a
        // durable, bucket-scoped, externally-referenced document can be is
        // already shared INTO THIS CONVERSATION and therefore already readable by
        // every member — the viewer-side READ gate in resolveReadAttachment still
        // runs on top. So the residual of a forged `media_id` is bounded to
        // mis-attributing media the forger can already see and re-upload
        // verbatim. The OUTBOUND (`document_id`) branch above keeps its strict
        // ownership gate untouched: that one resolves ANY document id in the
        // bucket, including never-referenced staged uploads.
        if (document.temporaryLocation === true) {
          this.logger.warn?.(
            {
              message:
                'Inbound attachment media_id resolves to a document that is still in staging; ignoring',
              mediaId: raw.media_id,
              storageBucketId,
            },
            LogContext.COMMUNICATION
          );
          return null;
        }
        return { document };
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

  /**
   * The ONE bucket-policy check (FR-020/FR-022), shared by the OUTBOUND send
   * validation (which throws) and the INBOUND re-home (which declines, see
   * rehomeOne). Returns the violated rule, or undefined when the content is
   * permitted. Deliberately takes the two content facts rather than an
   * `IDocument`, so it can also be applied to a file-service
   * `DocumentReferenceResult` before that content is re-homed into the bucket.
   */
  private checkAgainstBucketPolicy(
    bucket: IStorageBucket,
    content: { mimeType?: string; size?: number }
  ): 'mime-type' | 'size' | undefined {
    // An empty / unset allowedMimeTypes list means "no explicit MIME allow-list"
    // → no type restriction (platform convention). A non-empty list is enforced
    // as an allow-list. Conversation buckets always carry a curated non-empty
    // list, so in practice this branch always enforces.
    if (
      bucket.allowedMimeTypes?.length &&
      !bucket.allowedMimeTypes.includes(content.mimeType as MimeFileType)
    ) {
      return 'mime-type';
    }
    // maxFileSize === 0 (or unset) means "no explicit size limit" (platform
    // convention, matching how other buckets treat 0). Only a positive cap is
    // enforced — the truthiness check `bucket.maxFileSize && …` would have
    // skipped enforcement identically, but be explicit so the intent is clear.
    if (bucket.maxFileSize > 0 && (content.size ?? 0) > bucket.maxFileSize) {
      return 'size';
    }
    return undefined;
  }

  private validateAgainstBucketPolicy(
    bucket: IStorageBucket,
    document: IDocument
  ): void {
    const violation = this.checkAgainstBucketPolicy(bucket, document);
    if (violation === 'mime-type') {
      throw new ValidationException(
        'Attachment type is not permitted in this conversation',
        LogContext.COMMUNICATION
      );
    }
    if (violation === 'size') {
      throw new ValidationException(
        'Attachment exceeds the maximum allowed size',
        LogContext.COMMUNICATION
      );
    }
  }

  /**
   * Resolve the attachment bucket for ANY supported room type — conversation
   * rooms (the conversation's own bucket) AND comment rooms (the parent
   * callout/post's collaboration bucket), both via getTargetBucketForRoom.
   * Throws only when the room type is genuinely unsupported (or its target
   * bucket can't be resolved), so the error message must reflect that comment
   * rooms ARE supported.
   */
  private async getAttachmentBucketForRoomOrFail(
    room: IRoom
  ): Promise<IStorageBucket> {
    const bucket = await this.getTargetBucketForRoom(room);
    if (!bucket) {
      throw new ValidationException(
        'Attachments are only supported on conversation and comment rooms',
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
        calloutId,
        { relations: { directStorage: { authorization: true } } }
      );
    return aggregator.directStorage ?? undefined;
  }

  /**
   * Resolve a comment room (callout or post) to its owning callout id. DRY:
   * delegates to RoomResolverService's canonical room→callout resolution
   * (getCalloutForRoom for callout comment rooms, getCalloutWithPostContributionForRoom
   * for post comment rooms) instead of re-querying Callout/Post here. Those
   * helpers THROW EntityNotFoundException for a genuine "no callout for this
   * room" miss, but also PROPAGATE real DB/infra errors from the underlying
   * find. This re-home path is best-effort for the genuine no-callout case and
   * must return `undefined` (leave the media in staging) — so each call catches
   * ONLY EntityNotFoundException and RE-THROWS everything else. A transient DB
   * error must NOT be swallowed into `undefined`: on the OUTBOUND send path a
   * masked miss becomes a terminal ValidationException ("only supported on
   * conversation and comment rooms") for a VALID comment room during a momentary
   * DB blip, when the send should instead see the real (retryable) error. The
   * INBOUND re-home path already wraps getTargetBucketForRoom in its own
   * leave-in-staging try/catch, so a re-thrown DB error still degrades gracefully
   * there.
   */
  private async resolveParentCalloutId(
    room: IRoom
  ): Promise<string | undefined> {
    if (room.type === RoomType.CALLOUT) {
      // [2] accepted DRY cost: getCalloutForRoom eager-loads the full Callout
      // (+ calloutsSet join) where only callout.id is used here — the accepted
      // tradeoff for a single source of truth over a hand-rolled id-only query
      // on this (non-hottest) re-home path.
      return this.resolveCalloutIdOrUndefined(() =>
        this.roomResolverService.getCalloutForRoom(room.id)
      );
    }
    if (room.type === RoomType.POST) {
      // [2] accepted DRY cost: getCalloutWithPostContributionForRoom eager-loads
      // the full Callout + contribution + post + profile joins where only
      // callout.id is used — accepted for the single-source-of-truth reuse.
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

  /**
   * Shared not-found→undefined narrowing for both comment-room paths (callout
   * and post). The RoomResolverService helpers THROW EntityNotFoundException
   * for a genuine "no callout for this room" miss but PROPAGATE real DB/infra
   * errors — so catch ONLY EntityNotFoundException (→ undefined, leave media in
   * staging) and RE-THROW everything else (retryable, must not be masked).
   * Extracted from the two branches above so the not-found-vs-propagate policy
   * cannot silently diverge between them.
   */
  private async resolveCalloutIdOrUndefined(
    load: () => Promise<{ id: string } | undefined>
  ): Promise<string | undefined> {
    try {
      return (await load())?.id;
    } catch (e) {
      if (e instanceof EntityNotFoundException) {
        return undefined; // genuine no-callout → leave media in staging
      }
      throw e; // real DB/infra error must propagate (retryable), not be masked
    }
  }

  private isCommentRoom(room: IRoom): boolean {
    return room.type === RoomType.CALLOUT || room.type === RoomType.POST;
  }
}
