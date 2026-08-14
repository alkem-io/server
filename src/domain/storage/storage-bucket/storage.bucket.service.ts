import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  MimeFileType,
} from '@common/enums/mime.file.type';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { StorageUploadFailedException } from '@common/exceptions/storage/storage.upload.failed.exception';
import { streamToBuffer, tryRollback } from '@common/utils';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateDocumentResult } from '@services/adapters/file-service-adapter/dto';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Readable } from 'stream';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { Document } from '../document/document.entity';
import { IDocument } from '../document/document.interface';
import { DocumentService } from '../document/document.service';
import { StorageBucketArgsDocuments } from './dto/storage.bucket.args.documents';
import { CreateStorageBucketInput } from './dto/storage.bucket.dto.create';
import { IStorageBucketParent } from './dto/storage.bucket.dto.parent';
import { StorageBucket } from './storage.bucket.entity';
import { IStorageBucket } from './storage.bucket.interface';

// Used when an upload arrives with no filename — e.g. a clipboard paste or
// drag-drop that produces File { name: '' }. An empty multipart filename
// attribute is dropped by form-data, which in turn causes file-service-go
// to reject the part as "missing file".
const UNSPECIFIED_FILENAME = '_unspecified_';

@Injectable()
export class StorageBucketService {
  DEFAULT_MAX_ALLOWED_FILE_SIZE = 15728640;

  constructor(
    private documentService: DocumentService,
    private avatarCreatorService: AvatarCreatorService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private urlGeneratorService: UrlGeneratorService,
    @InjectRepository(StorageBucket)
    private storageBucketRepository: Repository<StorageBucket>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private configService: ConfigService,
    private fileServiceAdapter: FileServiceAdapter,
    private tagsetService: TagsetService
  ) {}

  public createStorageBucket(
    storageBucketData: CreateStorageBucketInput
  ): IStorageBucket {
    const storage: IStorageBucket = new StorageBucket();
    storage.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.STORAGE_BUCKET
    );
    storage.documents = [];
    storage.allowedMimeTypes =
      storageBucketData?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;
    storage.maxFileSize =
      storageBucketData?.maxFileSize || this.DEFAULT_MAX_ALLOWED_FILE_SIZE;
    storage.storageAggregator = storageBucketData.storageAggregator;

    return storage;
  }

  async deleteStorageBucket(storageID: string): Promise<IStorageBucket> {
    const storage = await this.getStorageBucketOrFail(storageID, {
      relations: { documents: true },
    });

    if (storage.authorization)
      await this.authorizationPolicyService.delete(storage.authorization);

    if (storage.documents) {
      for (const document of storage.documents) {
        await this.documentService.deleteDocument({
          ID: document.id,
        });
      }
    }

    const result = await this.storageBucketRepository.remove(
      storage as StorageBucket
    );
    result.id = storageID;
    return result;
  }

  public async save(
    storage: IStorageBucket,
    mgr?: EntityManager
  ): Promise<IStorageBucket> {
    if (mgr) return mgr.save(storage as StorageBucket);
    return this.storageBucketRepository.save(storage);
  }

  async getStorageBucketOrFail(
    storageBucketID: string,
    options?: FindOneOptions<StorageBucket>
  ): Promise<IStorageBucket> {
    if (!storageBucketID) {
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    }
    const storageBucket = await this.storageBucketRepository.findOneOrFail({
      where: { id: storageBucketID },
      ...options,
    });
    if (!storageBucket)
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    return storageBucket;
  }

  public async getDocuments(
    storageInput: IStorageBucket
  ): Promise<IDocument[]> {
    const storage = await this.getStorageBucketOrFail(storageInput.id, {
      relations: { documents: true },
    });
    const documents = storage.documents;
    if (!documents)
      throw new EntityNotFoundException(
        `Undefined storage documents found: ${storage.id}`,
        LogContext.STORAGE_BUCKET
      );

    return documents;
  }
  public async uploadFileAsDocument(
    storageBucketId: string,
    readStream: Readable,
    filename: string,
    mimeType: string,
    userID: string,
    temporaryDocument = false
  ): Promise<IDocument> {
    // Clipboard paste and some drag-drop paths yield File { name: '' };
    // an empty filename causes form-data to drop the `filename=` attribute,
    // which file-service-go then rejects as a missing file part. Normalise
    // at the boundary so downstream sees a non-empty displayName and the
    // multipart body always carries a filename attribute.
    const effectiveFilename = filename?.trim() || UNSPECIFIED_FILENAME;
    try {
      const streamTimeoutMs = this.configService.get<number>(
        'storage.file.stream_timeout_ms',
        { infer: true }
      )!;
      const buffer = await streamToBuffer(readStream, streamTimeoutMs);

      // Go file-service-go handles image processing (HEIC→JPEG, compression)
      return await this.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        buffer,
        effectiveFilename,
        mimeType,
        userID,
        temporaryDocument
      );
    } catch (error: any) {
      if (error instanceof StorageUploadFailedException) {
        throw error;
      }
      throw new StorageUploadFailedException(
        'Upload failed!',
        LogContext.STORAGE_BUCKET,
        {
          message: error.message,
          fileName: effectiveFilename,
          storageBucketId,
          originalException: error,
        }
      );
    }
  }

  /**
   * Upload a buffer as a new file row in `storageBucketId`.
   *
   * The optional `allowedMimeTypesOverride` lets specific flows widen the
   * accepted MIME set beyond what the destination bucket normally allows
   * — used by the Collabora import flow, where the bucket's policy is
   * tighter than the set of formats the editor can open. When the
   * override is provided:
   *   - the bucket-side `validateMimeTypes` check is skipped (the
   *     caller-claimed mimeType may not be in `bucket.allowedMimeTypes`,
   *     which is fine — file-service-go sniffs the actual MIME from
   *     content and validates against the override list instead).
   *   - the override is forwarded to file-service-go as
   *     `allowedMimeTypes`, so its content-sniff validation enforces
   *     exactly the caller's expected set.
   * `validateSize` against the bucket's `maxFileSize` always applies.
   */
  public async uploadFileAsDocumentFromBuffer(
    storageBucketId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userID?: string,
    temporaryLocation = false,
    skipDedup = false,
    allowedMimeTypesOverride?: string[]
  ): Promise<IDocument> {
    // `storageAggregator` is joined ONLY to classify the bucket for the
    // per-uploader-row rule below — a single FK join.
    const storage = await this.getStorageBucketOrFail(storageBucketId, {
      relations: { storageAggregator: true },
    });

    const effectiveAllowedMimes =
      allowedMimeTypesOverride ?? storage.allowedMimeTypes;
    if (!allowedMimeTypesOverride) {
      this.validateMimeTypes(storage, mimeType);
    }
    this.validateSize(storage, buffer.length);

    // Conversation buckets and staged (temporary) uploads must NEVER
    // content-dedup — see requiresPerUploaderDocuments.
    const effectiveSkipDedup =
      skipDedup ||
      this.requiresPerUploaderDocuments(storage, temporaryLocation);

    return this.persistDocumentWithPreparedAuth(
      storageBucketId,
      (authId, tagsetId) =>
        this.fileServiceAdapter.createDocument(buffer, {
          displayName: filename,
          mimeType,
          storageBucketId,
          authorizationId: authId,
          tagsetId,
          createdBy: userID || undefined,
          temporaryLocation,
          allowedMimeTypes: effectiveAllowedMimes.join(','),
          maxFileSize: storage.maxFileSize,
          skipDedup: effectiveSkipDedup || undefined,
        })
    );
  }

  /**
   * Whether this upload must get its OWN row rather than being collapsed into
   * an existing one by file-service's per-bucket CONTENT dedup. True for
   * CONVERSATION buckets, and for any STAGED (`temporaryLocation`) upload
   * (feature 013).
   *
   * WHY THE `temporaryLocation` LEG: message attachments are not only sent in
   * conversation rooms. A callout/post COMMENT-room attachment uploads into the
   * parent callout's pre-existing COLLABORATION bucket (see
   * MessageAttachmentService.getCommentRoomParentBucket), where the callout's own
   * content media already lives — and that bucket hangs off the SPACE storage
   * aggregator, indistinguishable by type from every other space bucket, so the
   * bucket-type test below neither covers it nor could be widened to. Content
   * dedup there hands the sender a PRE-EXISTING durable row.
   * `resolveOutboundAttachments` then rejects it with 'Attachment is not owned by
   * the sender' or 'Attachment has already been sent' for a perfectly ordinary
   * file. `temporaryLocation` is the right discriminator because it is exactly
   * the attachment path and nothing else in that bucket: a sendable attachment
   * MUST be a fresh unsent upload (the send path's single-use gate requires
   * `temporaryLocation === true`), while callout/post CONTENT uploads into the
   * same bucket are durable from the start and keep deduping untouched.
   *
   * It is also the correct rule independently of 013: a staged upload is by
   * definition a row its uploader will later MUTATE (move bucket, flip durable,
   * or roll back — see TemporaryStorageService.moveTemporaryDocuments), so
   * handing back a row that belongs to someone else, or one already committed,
   * is never what the caller asked for. Same reasoning already applied
   * explicitly by the Collabora create/replace flows, which pass both
   * `temporaryLocation: true` and `skipDedup: true` "so this doc owns its own
   * backing row".
   *
   * WHY (bucket type): a conversation bucket is SHARED by every member, and message
   * attachments are attributed by `createdBy` on both the send and the read
   * path — the outbound send requires the document to be owned by the sender
   * and to still be an unsent (`temporaryLocation`) upload, and the read
   * resolves an outbound `document_id` only when it is owned by the message's
   * sender. Content dedup breaks both at once: after Alice sends `logo.png`,
   * Bob uploading the SAME BYTES into the same conversation bucket got back
   * ALICE's now-durable row (`reused: true`), which then failed the ownership
   * gate AND the single-use gate — so Bob simply could not send that file, and
   * neither could Alice send it a second time. Reachable in any group
   * conversation where two people share the same image.
   *
   * Fixing it HERE (a fresh row per uploader) rather than by relaxing those
   * gates is deliberate: the gates are the confused-deputy protection that
   * stops a crafted event or a guessed id surfacing/pinning another member's
   * document, and the read-path ownership check is what makes them binding —
   * relaxing the send gate alone would let the send succeed and still resolve
   * to nothing on every read. Giving each sender their own row satisfies both
   * gates untouched.
   *
   * Cost is a row, not bytes: content is content-addressed, so the second row
   * points at the SAME blob, and file-service only deletes a blob once no row
   * references it. This mirrors the established `skipDedup: true` usage for
   * Collabora documents and profile-document re-uploads, where each entity
   * likewise must own its backing row.
   */
  private requiresPerUploaderDocuments(
    storageBucket: IStorageBucket,
    temporaryLocation: boolean
  ): boolean {
    return temporaryLocation || this.isConversationBucket(storageBucket);
  }

  /**
   * Copy an existing document into another bucket via file-service-go's
   * /internal/file/copy endpoint (v0.0.14+). No bytes traverse the wire —
   * the new row references the same content. Replaces the legacy
   * `getDocumentContent` + `uploadFileAsDocumentFromBuffer` round-trip.
   *
   * The destination bucket's allowed-mime-types and max-size policy are
   * still enforced on the source's metadata, so a per-bucket policy that's
   * tighter than the source bucket's still rejects the copy.
   */
  public async copyDocumentToBucket(
    destinationBucketId: string,
    sourceDocument: IDocument,
    userID?: string,
    skipDedup = false
  ): Promise<IDocument> {
    const destination = await this.getStorageBucketOrFail(destinationBucketId, {
      relations: {},
    });

    this.validateMimeTypes(destination, sourceDocument.mimeType);
    this.validateSize(destination, sourceDocument.size);

    return this.persistDocumentWithPreparedAuth(
      destinationBucketId,
      (authId, tagsetId) =>
        this.fileServiceAdapter.copyDocument({
          sourceId: sourceDocument.id,
          destinationBucketId,
          authorizationId: authId,
          tagsetId,
          createdBy: userID || sourceDocument.createdBy || undefined,
          skipDedup: skipDedup || undefined,
        })
    );
  }

  /**
   * Shared scaffolding for any operation that needs to materialize a new
   * `Document` row in `bucketId`: pre-create the auth-policy + tagset that
   * the document FK-references, run the caller-supplied file-service-go
   * call, then either:
   *   - on dedup-reuse (`result.reused === true`): release the pre-created
   *     rows since Go ignored them and kept the existing row's values
   *     authoritative;
   *   - on error: roll back every pre-created resource AND, if Go did
   *     create a fresh row before the failure, delete it too. On reuse
   *     during a later failure, the source row belongs to another caller
   *     and must be preserved.
   *
   * Both create and copy flows go through here so the auth/tagset
   * lifecycle and dedup-reuse contract stay consistent across the two.
   */
  private async persistDocumentWithPreparedAuth(
    bucketId: string,
    goCall: (authId: string, tagsetId: string) => Promise<CreateDocumentResult>
  ): Promise<IDocument> {
    let savedAuth;
    let savedTagset;
    let result;
    let document;
    try {
      const authorization = new AuthorizationPolicy(
        AuthorizationPolicyType.DOCUMENT
      );
      savedAuth = await this.authorizationPolicyService.save(authorization);

      const tagset = this.tagsetService.createTagset({
        name: TagsetReservedName.DEFAULT,
        tags: [],
      });
      savedTagset = await this.tagsetService.save(tagset);

      result = await goCall(savedAuth.id, savedTagset.id);

      // Load with relations needed for auth/tagset consumers. On dedup
      // reuse this is an existing row; otherwise the freshly-inserted one.
      document = await this.documentService.getDocumentOrFail(result.id, {
        relations: {
          authorization: true,
          tagset: { authorization: true },
          storageBucket: true,
        },
      });
    } catch (error) {
      // Independent rollbacks so one cleanup failure doesn't skip the rest.
      // Bind narrowed values into const locals so the closures don't re-widen.
      //
      // Important: only delete the Go-side document if this request created
      // it (reused=false). On a dedup reuse, `result.id` refers to someone
      // else's existing document — deleting it would corrupt their data.
      const createdDoc = result;
      if (createdDoc && !createdDoc.reused) {
        await tryRollback(
          () => this.fileServiceAdapter.deleteDocument(createdDoc.id),
          `Failed to rollback Go-side document ${createdDoc.id}`,
          this.logger,
          LogContext.STORAGE_BUCKET
        );
      }
      const createdAuth = savedAuth;
      if (createdAuth) {
        await tryRollback(
          () => this.authorizationPolicyService.delete(createdAuth),
          `Failed to rollback auth policy ${createdAuth.id}`,
          this.logger,
          LogContext.STORAGE_BUCKET
        );
      }
      const createdTagset = savedTagset;
      if (createdTagset) {
        await tryRollback(
          () => this.tagsetService.removeTagset(createdTagset.id),
          `Failed to rollback tagset ${createdTagset.id}`,
          this.logger,
          LogContext.STORAGE_BUCKET
        );
      }
      throw error;
    }

    // Dedup-reuse: caller-supplied authorizationId / tagsetId were ignored
    // by Go (existing row authoritative). Release our pre-created rows so
    // they don't become DB orphans.
    if (result.reused) {
      const reusedAuth = savedAuth;
      if (reusedAuth) {
        await tryRollback(
          () => this.authorizationPolicyService.delete(reusedAuth),
          `Failed to release pre-created auth policy ${reusedAuth.id} on dedup reuse`,
          this.logger,
          LogContext.STORAGE_BUCKET
        );
      }
      const reusedTagset = savedTagset;
      if (reusedTagset) {
        await tryRollback(
          () => this.tagsetService.removeTagset(reusedTagset.id),
          `Failed to release pre-created tagset ${reusedTagset.id} on dedup reuse`,
          this.logger,
          LogContext.STORAGE_BUCKET
        );
      }
    }

    // Attach post-rotation image dimensions (when present on the file-
    // service-go response) as transient runtime fields on the returned
    // entity. Server-side validators (e.g. visual.service.ts) read these
    // instead of decoding bytes locally — file-service-go already did the
    // canonicalizing decode and cached the values in `file.content_metadata`.
    // Non-image uploads have undefined dims; that's expected.
    if (result.imageWidth !== undefined) {
      document.imageWidth = result.imageWidth;
    }
    if (result.imageHeight !== undefined) {
      document.imageHeight = result.imageHeight;
    }

    this.logger.verbose?.(
      `Materialized document '${result.externalID}' via file-service on storage bucket: ${bucketId}`,
      LogContext.STORAGE_BUCKET
    );
    return document;
  }

  async uploadFileFromURI(
    uri: string,
    entityId: string,
    storageBucket: IStorageBucket,
    readStream: Readable,
    filename: string,
    mimetype: string,
    userID: string
  ): Promise<IDocument> {
    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.DOCUMENT
      );

    const documentForReference =
      await this.documentService.getDocumentFromURL(uri);

    try {
      const newDocument = await this.uploadFileAsDocument(
        storageBucket.id,
        readStream,
        filename,
        mimetype,
        userID
      );
      // Delete the old document, if any. Do not delete the same doc.
      if (
        documentForReference &&
        newDocument.externalID != documentForReference.externalID
      ) {
        await this.documentService.deleteDocument({
          ID: documentForReference.id,
        });
      }
      return newDocument;
    } catch (error: any) {
      throw new StorageUploadFailedException(
        'Upload on reference or link failed!',
        LogContext.STORAGE_BUCKET,
        {
          message: error.message,
          fileName: filename,
          referenceID: entityId,
          originalException: error,
        }
      );
    }
  }

  /**
   * @throws {Error}
   */
  public async addDocumentToStorageBucketOrFail(
    storageBucket: IStorageBucket,
    document: IDocument
  ): Promise<IDocument> {
    this.validateMimeTypes(storageBucket, document.mimeType);
    this.validateSize(storageBucket, document.size);
    document.storageBucket = storageBucket;
    if (!storageBucket.documents.includes(document)) {
      storageBucket.documents.push(document);
    }
    this.logger.verbose?.(
      `Added document '${document.externalID}' on storage bucket: ${storageBucket.id}`,
      LogContext.STORAGE_BUCKET
    );
    return document;
  }

  public async addDocumentToStorageBucketByIdOrFail(
    storageBucketId: string,
    document: IDocument
  ): Promise<IDocument> {
    const storageBucket = await this.getStorageBucketOrFail(storageBucketId);
    return this.addDocumentToStorageBucketOrFail(storageBucket, document);
  }

  public async size(storage: IStorageBucket): Promise<number> {
    const documentsSize = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.storageBucketId = :storageBucketId', {
        storageBucketId: storage.id,
      })
      .select('SUM(size)', 'totalSize')
      .getRawOne<{ totalSize: number }>();

    return documentsSize?.totalSize ?? 0;
  }

  public async getFilteredDocuments(
    storage: IStorageBucket,
    args: StorageBucketArgsDocuments,
    actorContext: ActorContext
  ): Promise<IDocument[]> {
    // `storageAggregator` is joined ONLY to classify the bucket for the staging
    // rule below (see isListableInStagingState) — it is a single FK join.
    const storageLoaded = await this.getStorageBucketOrFail(storage.id, {
      relations: { documents: true, storageAggregator: true },
    });
    const allDocuments = storageLoaded.documents;
    if (!allDocuments)
      throw new EntityNotFoundException(
        `Storage not initialised, no documents: ${storage.id}`,
        LogContext.STORAGE_BUCKET
      );

    // First filter the documents the current user has READ privilege to, then —
    // on CONVERSATION buckets only — hide OTHER actors' still-staged uploads
    // (A3). See isListableInStagingState for why the rule is scoped.
    const hideOtherActorsStagedUploads =
      this.isConversationBucket(storageLoaded);
    const readableDocuments = allDocuments.filter(
      document =>
        this.hasAgentAccessToDocument(document, actorContext) &&
        (!hideOtherActorsStagedUploads ||
          this.isListableInStagingState(document, actorContext))
    );

    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: IDocument[] = [];
      for (const documentID of args.IDs) {
        const document = readableDocuments.find(e => e.id === documentID);

        if (!document)
          throw new EntityNotFoundException(
            `Document with requested ID (${documentID}) not located within current StorageBucket: ${storage.id}`,
            LogContext.STORAGE_BUCKET
          );
        results.push(document);
      }
      return results;
    }

    // (b) limit number of results
    if (args.limit) {
      return limitAndShuffle(readableDocuments, args.limit, false);
    }

    return readableDocuments;
  }

  private hasAgentAccessToDocument(
    document: IDocument,
    actorContext: ActorContext
  ): boolean {
    return this.authorizationService.isAccessGranted(
      actorContext,
      document.authorization,
      AuthorizationPrivilege.READ
    );
  }

  /**
   * A document that is still in its temporary (staging) location has NOT been
   * committed to anything yet — it is an in-flight upload that its uploader has
   * not finished with. On a CONVERSATION bucket it must therefore only be
   * LISTED for the actor that created it (A3).
   *
   * WHY THIS IS NEEDED: document authorization is INHERITED from the bucket, so
   * everyone who can read the bucket can read every document in it — including
   * uploads nobody has committed. Feature 013 made that a real disclosure: a
   * Conversation now exposes its shared, membership-authorized storage bucket
   * (`Conversation.storageBucket`), so without this filter every member could
   * enumerate every OTHER member's still-unsent attachment uploads — name, size
   * and a downloadable URL — before the message was ever sent.
   *
   * WHY IT IS SCOPED TO CONVERSATION BUCKETS: `getFilteredDocuments` backs
   * `StorageBucket.documents` and `StorageBucket.document(ID)` for EVERY bucket
   * on the platform. Applying the rule unconditionally silently narrowed a
   * long-standing listing everywhere — space/profile/collaboration buckets,
   * where other staging flows (Collabora import, profile temporary storage,
   * template + innovation-pack reference uploads) legitimately produce
   * `temporaryLocation` rows that admins and the owning flows expect to see
   * listed. That is a pre-existing platform behaviour and a broader lifecycle
   * question that feature 013 does not own. The NEW exposure 013 introduced is
   * the conversation bucket alone, so that is exactly where the new restriction
   * applies; every other bucket keeps its pre-013 listing.
   *
   * Deliberately a LISTING rule, not an authorization rule: it is applied at the
   * single GraphQL exposure choke point (`documents` / `document(ID)`), so it
   * cannot break any internal flow that resolves a staged document by id (e.g.
   * the outbound attachment send path, which goes through DocumentService).
   * Fail-closed on an unknown actor: an anonymous caller never matches
   * `createdBy` and therefore never sees a staged document.
   */
  private isListableInStagingState(
    document: IDocument,
    actorContext: ActorContext
  ): boolean {
    if (document.temporaryLocation !== true) {
      return true;
    }
    return (
      !!actorContext.actorID && document.createdBy === actorContext.actorID
    );
  }

  /**
   * True for the per-conversation buckets feature 013 creates
   * (`StorageAggregatorType.CONVERSATION`). Requires the `storageAggregator`
   * relation to be loaded; an unloaded/absent aggregator reads as "not a
   * conversation bucket", which keeps the platform-wide default behaviour.
   */
  private isConversationBucket(storageBucket: IStorageBucket): boolean {
    return (
      storageBucket.storageAggregator?.type ===
      StorageAggregatorType.CONVERSATION
    );
  }

  private validateMimeTypes(
    storageBucket: IStorageBucket,
    mimeType: string
  ): void {
    const result = Object.values(storageBucket.allowedMimeTypes).includes(
      mimeType as MimeFileType
    );
    if (!result) {
      throw new ValidationException(
        `Invalid Mime Type specified for storage bucket '${mimeType}'- allowed types: ${storageBucket.allowedMimeTypes}.`,
        LogContext.STORAGE_BUCKET
      );
    }
  }

  private validateSize(storageBucket: IStorageBucket, size: number): void {
    if (size > storageBucket.maxFileSize) {
      throw new ValidationException(
        `File size (${size}) exceeds maximum allowed file size for storage bucket: ${storageBucket.maxFileSize}`,
        LogContext.STORAGE_BUCKET
      );
    }
  }

  public async getStorageBucketsForAggregator(
    storageAggregatorID: string
  ): Promise<IStorageBucket[]> {
    return this.storageBucketRepository.find({
      where: {
        storageAggregator: {
          id: storageAggregatorID,
        },
      },
    });
  }

  public async getStorageBucketParent(
    storageBucket: IStorageBucket
  ): Promise<IStorageBucketParent | null> {
    const profile = await this.profileRepository.findOne({
      where: {
        storageBucket: {
          id: storageBucket.id,
        },
      },
    });
    if (profile) {
      return {
        id: profile.id,
        type: profile.type as ProfileType,
        displayName: profile.displayName,
        url: await this.urlGeneratorService.generateUrlForProfile(profile),
      };
    }

    return null;
  }

  public async ensureAvatarUrlIsDocument(
    avatarURL: string,
    storageBucketId: string,
    userId?: string
  ): Promise<IDocument> {
    if (this.documentService.isAlkemioDocumentURL(avatarURL)) {
      const document = await this.documentService.getDocumentFromURL(avatarURL);
      if (!document) {
        throw new EntityNotFoundException(
          `Document not found: ${avatarURL}`,
          LogContext.STORAGE_BUCKET
        );
      }
      return document;
    }

    // Not stored on Alkemio, download + store
    const imageBuffer = await this.avatarCreatorService.urlToBuffer(avatarURL);
    let fileType = await this.avatarCreatorService.getFileType(imageBuffer);
    if (!fileType) {
      fileType = MimeTypeVisual.PNG;
    }

    const document = await this.uploadFileAsDocumentFromBuffer(
      storageBucketId,
      imageBuffer,
      VisualType.AVATAR,
      fileType,
      userId
    );

    return document;
  }
}
