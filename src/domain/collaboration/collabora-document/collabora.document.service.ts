import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import {
  COLLABORA_SUPPORTED_MIMES,
  MIME_TO_DOCUMENT_TYPE,
  MIME_TO_EXTENSION,
} from '@common/enums/collabora.supported.mime.types';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WopiServiceAdapter } from '@services/adapters/wopi-service-adapter/wopi.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CollaboraDocument } from './collabora.document.entity';
import { ICollaboraDocument } from './collabora.document.interface';
import { CreateCollaboraDocumentInput } from './dto/collabora.document.dto.create';

@Injectable()
export class CollaboraDocumentService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(CollaboraDocument)
    private collaboraDocumentRepository: Repository<CollaboraDocument>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private storageAggregatorService: StorageAggregatorService,
    private wopiServiceAdapter: WopiServiceAdapter,
    private fileServiceAdapter: FileServiceAdapter
  ) {}

  public async createCollaboraDocument(
    input: CreateCollaboraDocumentInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICollaboraDocument> {
    const collaboraDocument: ICollaboraDocument = new CollaboraDocument();
    collaboraDocument.documentType = input.documentType;
    // Pick the canonical MIME for this category — the blank-create flow
    // always materializes one specific format per category. Imports
    // populate this from the actual sniffed MIME instead.
    collaboraDocument.originalMimeType = this.getDefaultMimeForCreate(
      input.documentType
    );
    collaboraDocument.createdBy = userID;
    collaboraDocument.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COLLABORA_DOCUMENT
    );

    // Create profile for the collabora document
    collaboraDocument.profile = await this.profileService.createProfile(
      { displayName: input.displayName },
      ProfileType.COLLABORA_DOCUMENT,
      storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(
      collaboraDocument.profile,
      {
        name: TagsetReservedName.DEFAULT,
        tags: [],
      }
    );

    // Create a zero-byte file with the correct MIME type and extension.
    // Collabora detects Size=0 in CheckFileInfo and auto-generates a blank
    // document via PutFile (WOPI "editnew" pattern).
    // If upload fails, clean up the already-created profile to avoid orphans.
    const emptyBuffer = Buffer.alloc(0);
    const mimeType = collaboraDocument.originalMimeType;
    const fileName = `${input.displayName}${MIME_TO_EXTENSION[mimeType]}`;

    const directStorage =
      await this.storageAggregatorService.getDirectStorageBucket(
        storageAggregator
      );
    const storageBucketId = directStorage.id;

    let document;
    try {
      // Skip file-service-go's content-hash dedup: the empty placeholder
      // here only establishes identity for WOPI; Collabora writes the real
      // content via PutFile later. Two collabora docs created in the same
      // bucket with `Buffer.alloc(0)` would otherwise share a backing row
      // and corrupt each other's edits.
      document = await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        emptyBuffer,
        fileName,
        mimeType,
        userID,
        false,
        true
      );
    } catch (error) {
      // Compensate: remove the profile created above
      try {
        await this.profileService.deleteProfile(collaboraDocument.profile.id);
      } catch (_cleanupError) {
        this.logger.warn?.(
          `Failed to clean up profile ${collaboraDocument.profile.id} after document upload failure`,
          LogContext.COLLABORATION
        );
      }
      throw error;
    }

    collaboraDocument.document = document;

    return collaboraDocument;
  }

  /**
   * Build a CollaboraDocument from an uploaded file. Mirrors
   * `createCollaboraDocument` for the post-doc bookkeeping (profile,
   * auth, tagset, error rollback) but starts from real content
   * instead of `Buffer.alloc(0)`. file-service-go sniffs the actual
   * MIME from content and rejects anything outside our supported list
   * with `415 ErrUnsupportedMediaType`. We never inspect file bytes
   * server-side — the sniffed MIME comes back on the response and
   * drives `documentType` + `originalMimeType`.
   *
   * Two-phase via `temporaryLocation: true`: the upload lands in temp
   * first, we link it to the entity and persist, then flip
   * `temporaryLocation: false`. If anything between upload and finalize
   * fails, the temp row is deleted so we don't leak orphans.
   */
  public async importCollaboraDocument(
    file: { buffer: Buffer; filename: string; mimetype: string },
    displayNameOverride: string | undefined,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICollaboraDocument> {
    const directStorage =
      await this.storageAggregatorService.getDirectStorageBucket(
        storageAggregator
      );
    const storageBucketId = directStorage.id;

    // Phase 1: upload to a temp location. Server doesn't sniff MIME —
    // file-service-go does, and rejects anything outside our supported
    // list (passed via the override). The returned `document.mimeType`
    // is the sniffed value, not the caller-claimed `file.mimetype`.
    let document;
    try {
      document = await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        file.buffer,
        file.filename,
        file.mimetype,
        userID,
        true, // temporaryLocation — finalize after entity wiring
        true, // skipDedup — each import gets its own row
        COLLABORA_SUPPORTED_MIMES
      );
    } catch (error) {
      // file-service-go rejected (unsupported MIME, size, etc.) — nothing
      // to clean up, just propagate.
      throw error;
    }

    const sniffedMime = document.mimeType;
    const documentType = MIME_TO_DOCUMENT_TYPE[sniffedMime];
    if (!documentType) {
      // Defensive: file-service-go's allowlist matched our list, so this
      // would be a bug in our static maps. Clean up the temp row before
      // throwing so we don't leak a now-unreferenceable file.
      await this.fileServiceAdapter
        .deleteDocument(document.id)
        .catch(() => undefined);
      throw new RelationshipNotFoundException(
        'Imported file MIME not in CollaboraDocument category map',
        LogContext.COLLABORATION,
        { sniffedMime }
      );
    }

    // Derive the user-visible display name. Prefer the explicit override;
    // else strip the extension from the original filename.
    const displayName =
      displayNameOverride ??
      this.deriveDisplayNameFromFilename(file.filename) ??
      'Imported document';

    // Phase 2: build the entity. Profile + auth follow the same pattern
    // as the blank-create flow.
    const collaboraDocument: ICollaboraDocument = new CollaboraDocument();
    collaboraDocument.documentType = documentType;
    collaboraDocument.originalMimeType = sniffedMime;
    collaboraDocument.createdBy = userID;
    collaboraDocument.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COLLABORA_DOCUMENT
    );

    try {
      collaboraDocument.profile = await this.profileService.createProfile(
        { displayName },
        ProfileType.COLLABORA_DOCUMENT,
        storageAggregator
      );
      await this.profileService.addOrUpdateTagsetOnProfile(
        collaboraDocument.profile,
        {
          name: TagsetReservedName.DEFAULT,
          tags: [],
        }
      );
    } catch (error) {
      // Clean up the temp file row so we don't leak it.
      await this.fileServiceAdapter
        .deleteDocument(document.id)
        .catch(() => undefined);
      throw error;
    }

    collaboraDocument.document = document;

    // Phase 3: finalize — flip the file row out of temp. Doing this after
    // the entity is constructed (but before save) means a save failure
    // leaves an orphan permanent file; we accept that trade-off because
    // the alternative — finalize-after-save — opens a worse window where
    // a temp file is still permanently linked to a saved entity (the
    // first edit would create a new row via the usual temp→permanent
    // dance and silently orphan the original).
    try {
      await this.fileServiceAdapter.updateDocument(document.id, {
        temporaryLocation: false,
      });
    } catch (error) {
      // Best-effort cleanup before propagating.
      try {
        await this.profileService.deleteProfile(collaboraDocument.profile.id);
      } catch (_cleanupError) {
        this.logger.warn?.(
          `Failed to clean up profile ${collaboraDocument.profile.id} after import finalize failure`,
          LogContext.COLLABORATION
        );
      }
      await this.fileServiceAdapter
        .deleteDocument(document.id)
        .catch(() => undefined);
      throw error;
    }

    return collaboraDocument;
  }

  /**
   * Strip the file extension from a filename for use as a profile
   * displayName. Keeps the original casing. Returns undefined if the
   * input is blank after stripping.
   */
  private deriveDisplayNameFromFilename(filename: string): string | undefined {
    const lastDot = filename.lastIndexOf('.');
    const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const trimmed = base.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  public async getCollaboraDocumentOrFail(
    collaboraDocumentID: string,
    options?: FindOneOptions<CollaboraDocument>
  ): Promise<ICollaboraDocument | never> {
    const collaboraDocument = await this.collaboraDocumentRepository.findOne({
      where: { id: collaboraDocumentID },
      ...options,
    });
    if (!collaboraDocument)
      throw new EntityNotFoundException(
        'Not able to locate CollaboraDocument with the specified ID',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    return collaboraDocument;
  }

  public async getEditorUrl(
    collaboraDocumentID: string,
    actorJWT: string
  ): Promise<{ editorUrl: string; accessTokenTTL: number }> {
    const collaboraDocument = await this.getCollaboraDocumentOrFail(
      collaboraDocumentID,
      {
        relations: { document: true },
      }
    );

    if (!collaboraDocument.document) {
      throw new RelationshipNotFoundException(
        'Document not found on CollaboraDocument',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }

    const result = await this.wopiServiceAdapter.issueToken(
      collaboraDocument.document.id,
      actorJWT
    );

    return {
      editorUrl: result.editorUrl,
      accessTokenTTL: result.accessTokenTTL,
    };
  }

  public async deleteCollaboraDocument(
    collaboraDocumentID: string
  ): Promise<ICollaboraDocument> {
    const collaboraDocument = await this.getCollaboraDocumentOrFail(
      collaboraDocumentID,
      {
        relations: {
          authorization: true,
          profile: true,
          document: true,
        },
      }
    );

    if (collaboraDocument.document) {
      await this.documentService.deleteDocument({
        ID: collaboraDocument.document.id,
      });
    }

    if (collaboraDocument.profile) {
      await this.profileService.deleteProfile(collaboraDocument.profile.id);
    }

    if (collaboraDocument.authorization) {
      await this.authorizationPolicyService.delete(
        collaboraDocument.authorization
      );
    }

    const result = await this.collaboraDocumentRepository.remove(
      collaboraDocument as CollaboraDocument
    );
    result.id = collaboraDocumentID;
    return result;
  }

  public async updateCollaboraDocument(
    collaboraDocumentID: string,
    displayName: string
  ): Promise<ICollaboraDocument> {
    const collaboraDocument = await this.getCollaboraDocumentOrFail(
      collaboraDocumentID,
      {
        relations: { profile: true, document: true },
      }
    );

    if (!collaboraDocument.profile) {
      throw new RelationshipNotFoundException(
        'Profile not found on CollaboraDocument',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }
    if (!collaboraDocument.document) {
      throw new RelationshipNotFoundException(
        'Document not found on CollaboraDocument',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }

    // Propagate rename to both stores so the editor's title bar (via WOPI's
    // BaseFileName) and the download dialog track the Alkemio-side rename.
    // Profile first (well-tested + cheap), then file-service-go. If the
    // file-service call fails, roll the profile back so the user doesn't
    // see a half-applied rename.
    const previousDisplayName = collaboraDocument.profile.displayName;
    // Drive the extension from the actual sniffed MIME of this file, not
    // from `documentType` — for imports a `.doc` and `.docx` are both
    // `WORDPROCESSING` but the rename must keep them distinct. Defensive
    // fallback to empty if the MIME isn't in our table (shouldn't happen
    // since file-service-go validates against COLLABORA_SUPPORTED_MIMES).
    const ext = MIME_TO_EXTENSION[collaboraDocument.originalMimeType] ?? '';

    await this.profileService.updateProfile(collaboraDocument.profile, {
      displayName,
    });

    try {
      await this.fileServiceAdapter.updateDocument(
        collaboraDocument.document.id,
        { displayName: `${displayName}${ext}` }
      );
    } catch (error) {
      await this.profileService
        .updateProfile(collaboraDocument.profile, {
          displayName: previousDisplayName,
        })
        .catch(rollbackError => {
          this.logger.error?.(
            {
              message:
                'Failed to roll back profile rename after file-service rename failure',
              collaboraDocumentId: collaboraDocumentID,
              originalError: String(error),
              rollbackError: String(rollbackError),
            },
            rollbackError instanceof Error ? (rollbackError.stack ?? '') : '',
            LogContext.COLLABORATION
          );
        });
      throw error;
    }

    return this.getCollaboraDocumentOrFail(collaboraDocumentID, {
      relations: { profile: true },
    });
  }

  /**
   * Default MIME for a blank-create flow. Each `documentType` maps to a
   * single canonical format we use when creating empty placeholders:
   * SPREADSHEET → .xlsx, PRESENTATION → .pptx, WORDPROCESSING → .docx,
   * DRAWING → .odg. Imported documents preserve their actual sniffed
   * MIME instead (stored on `originalMimeType`).
   */
  private getDefaultMimeForCreate(documentType: CollaboraDocumentType): string {
    const mimeMap: Record<CollaboraDocumentType, string> = {
      [CollaboraDocumentType.SPREADSHEET]:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [CollaboraDocumentType.PRESENTATION]:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [CollaboraDocumentType.WORDPROCESSING]:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [CollaboraDocumentType.DRAWING]:
        'application/vnd.oasis.opendocument.graphics',
    };
    return mimeMap[documentType];
  }
}
