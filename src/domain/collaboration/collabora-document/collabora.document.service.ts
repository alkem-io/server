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
  ValidationException,
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

  /**
   * Materialize a CollaboraDocument. Two sources of bytes:
   *
   *   - **Blank**: `input.documentType` + `input.displayName` required. We
   *     write a zero-byte placeholder with the canonical MIME for the
   *     chosen category. Collabora detects Size=0 in CheckFileInfo and
   *     auto-generates a blank document via PutFile (WOPI "editnew").
   *
   *   - **Upload**: `input.uploadedFile` is the user's bytes. file-service-go
   *     sniffs the MIME from content and rejects anything outside
   *     COLLABORA_SUPPORTED_MIMES (passed as the allowlist). The sniffed
   *     value drives `documentType` + `originalMimeType`. `displayName`
   *     defaults from the uploaded filename (extension stripped) when
   *     absent or empty.
   *
   * The flow is identical for both modes: stage the bytes via file-service-go
   * (upload uses `temporaryLocation: true` so a downstream entity-build
   * failure can roll the file row back; blank writes directly to permanent
   * since the placeholder has no rollback risk), build the entity (profile,
   * tagset, auth), and on the upload path flip the file out of temp at the
   * end. Any failure between staging and the final return rolls back the
   * staged file (and the profile, if it was created).
   */
  public async createCollaboraDocument(
    input: CreateCollaboraDocumentInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICollaboraDocument> {
    const isUpload = !!input.uploadedFile;
    if (!isUpload && (!input.displayName || !input.documentType)) {
      throw new ValidationException(
        'createCollaboraDocument requires displayName and documentType when no file is supplied.',
        LogContext.COLLABORATION
      );
    }

    const directStorage =
      await this.storageAggregatorService.getDirectStorageBucket(
        storageAggregator
      );
    const storageBucketId = directStorage.id;

    // Stage the bytes. skipDedup=true on both modes: each Collabora doc owns
    // its own backing row, otherwise two blank docs in the same bucket would
    // alias on Buffer.alloc(0) and corrupt each other's edits.
    const blankCanonicalMime = isUpload
      ? undefined
      : this.getDefaultMimeForCreate(input.documentType!);
    const stageBuffer = isUpload ? input.uploadedFile!.buffer : Buffer.alloc(0);
    const stageMimeHint = isUpload
      ? input.uploadedFile!.mimetype
      : blankCanonicalMime!;
    const stageFilename = isUpload
      ? input.uploadedFile!.filename
      : `${input.displayName}${MIME_TO_EXTENSION[blankCanonicalMime!]}`;

    const document =
      await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        stageBuffer,
        stageFilename,
        stageMimeHint,
        userID,
        isUpload, // temporaryLocation — finalize at the end on upload only
        true, // skipDedup
        isUpload ? COLLABORA_SUPPORTED_MIMES : undefined
      );

    // From here on, any failure must roll back what was staged: the file
    // row always, and the profile too if it was created before the failure.
    let createdProfileId: string | undefined;
    try {
      // Resolve documentType + originalMimeType. On upload the sniffed MIME
      // is authoritative; any documentType in the input is ignored. On blank
      // the input drives both.
      let documentType: CollaboraDocumentType;
      let originalMimeType: string;
      if (isUpload) {
        originalMimeType = document.mimeType;
        documentType = this.documentTypeFromSniffedMimeOrFail(originalMimeType);
      } else {
        documentType = input.documentType!;
        originalMimeType = blankCanonicalMime!;
      }

      // Resolve displayName. Explicit input wins; on upload, fall back to
      // the filename (extension stripped) when input is absent or empty
      // (per FR-012). The blank path validates input.displayName up front,
      // so neither fallback below is reachable on that path; the literal
      // `'Imported document'` is only ever used when an upload arrives with
      // no input override and a filename whose strip-extension result is
      // empty (e.g. `.docx`).
      const displayName =
        input.displayName ||
        (isUpload
          ? this.deriveDisplayNameFromFilename(input.uploadedFile!.filename)
          : undefined) ||
        'Imported document';

      const collaboraDocument: ICollaboraDocument = new CollaboraDocument();
      collaboraDocument.documentType = documentType;
      collaboraDocument.originalMimeType = originalMimeType;
      collaboraDocument.createdBy = userID;
      collaboraDocument.authorization = new AuthorizationPolicy(
        AuthorizationPolicyType.COLLABORA_DOCUMENT
      );

      collaboraDocument.profile = await this.profileService.createProfile(
        { displayName },
        ProfileType.COLLABORA_DOCUMENT,
        storageAggregator
      );
      createdProfileId = collaboraDocument.profile.id;
      await this.profileService.addOrUpdateTagsetOnProfile(
        collaboraDocument.profile,
        {
          name: TagsetReservedName.DEFAULT,
          tags: [],
        }
      );

      collaboraDocument.document = document;

      // Upload-only finalize. Done after entity wiring (but before any caller
      // save) so a save failure leaves an orphan permanent file rather than
      // a still-temp file linked to a saved entity — the latter would race
      // with the first edit's temp→permanent dance and silently orphan the
      // original.
      if (isUpload) {
        await this.fileServiceAdapter.updateDocument(document.id, {
          temporaryLocation: false,
        });
      }

      return collaboraDocument;
    } catch (error) {
      // Compensate: drop the profile if we got that far, and the staged
      // file row always. file-service-go's deleteDocument works on both
      // temporary and permanent rows so a single call cleans up either mode.
      if (createdProfileId) {
        try {
          await this.profileService.deleteProfile(createdProfileId);
        } catch (_cleanupError) {
          this.logger.warn?.(
            `Failed to clean up profile ${createdProfileId} during createCollaboraDocument rollback`,
            LogContext.COLLABORATION
          );
        }
      }
      await this.fileServiceAdapter
        .deleteDocument(document.id)
        .catch(() => undefined);
      throw error;
    }
  }

  /**
   * Map a file-service-sniffed MIME to its {@link CollaboraDocumentType}. Shared
   * by the create/import and replace flows, which both stage the file through
   * file-service-go (validated against `COLLABORA_SUPPORTED_MIMES`) — so an
   * unmapped MIME here means our static maps are out of sync, an internal error
   * rather than a user one.
   */
  private documentTypeFromSniffedMimeOrFail(
    sniffedMime: string
  ): CollaboraDocumentType {
    const documentType = MIME_TO_DOCUMENT_TYPE[sniffedMime];
    if (!documentType) {
      throw new RelationshipNotFoundException(
        'Sniffed file MIME not in CollaboraDocument category map',
        LogContext.COLLABORATION,
        { sniffedMime }
      );
    }
    return documentType;
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

  /**
   * Reverse-resolve a CollaboraDocument by the id of its backing storage
   * `Document` (= `access_tokens.file_id` minted at `getEditorUrl` for
   * `collaboraDocument.document.id`). The Collabora contribution event carries
   * the storage `Document` id — NOT the `CollaboraDocument` id — so the
   * consumer must bridge it back to the domain entity before reporting.
   * Returns `null` when no CollaboraDocument is backed by that storage id
   * (deleted/unknown document) so the caller can log-and-discard (FR-008).
   */
  public async getCollaboraDocumentByStorageDocumentId(
    storageDocumentID: string,
    options?: FindOneOptions<CollaboraDocument>
  ): Promise<ICollaboraDocument | null> {
    return this.collaboraDocumentRepository.findOne({
      ...options,
      // `where` last so a caller-supplied `options` cannot override the
      // storage-document filter this method's contract guarantees.
      where: { document: { id: storageDocumentID } },
    });
  }

  public async getEditorUrl(
    collaboraDocumentID: string,
    actorID: string,
    actorName?: string
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
      actorID,
      actorName
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
   * Swap the backing file of an existing CollaboraDocument in place while
   * preserving its identity (id, createdBy/createdDate, profile/displayName,
   * authorization, documentType) and any surface link to it (e.g. a callout's
   * framing link). Only the `document` FK is re-pointed to a newly-staged file
   * row; the old backing file is released afterward. Surface-agnostic — it
   * operates on a CollaboraDocument by id.
   *
   * Guarantees (feature 014-officedocs-replace-file):
   *  - FR-013 active-edit guard: refuses if the document currently has a live
   *    WOPI lock. The lock-status call is FAIL-CLOSED (see the adapter): an
   *    unavailable signal blocks the swap.
   *  - FR-004/005/012 validation: reuses `uploadFileAsDocumentFromBuffer` with
   *    the Collabora allowlist + the bucket size cap; file-service-go
   *    content-sniffs the MIME rather than trusting the extension.
   *  - FR-006 same-type rule: the sniffed MIME must map to the SAME
   *    `documentType`; otherwise the swap is rejected. `documentType` never
   *    changes.
   *  - FR-008 atomicity: on any failure before the FK is re-pointed the
   *    freshly-staged temp file is deleted and the original document + file
   *    are left intact.
   *  - FR-010: the old backing file is deleted only AFTER the new file is
   *    finalized out of temp and the FK re-pointed.
   *  - FR-009/FR-015: `displayName` is intentionally NOT accepted here — the
   *    resolver ignores it. The stored profile display name is unchanged
   *    (rename persistence is feature 016).
   */
  public async replaceCollaboraDocument(
    collaboraDocumentID: string,
    buffer: Buffer,
    filename: string,
    mimetype: string,
    userID?: string
  ): Promise<ICollaboraDocument> {
    const collaboraDocument = await this.getCollaboraDocumentOrFail(
      collaboraDocumentID,
      {
        relations: { document: { storageBucket: true } },
      }
    );

    if (!collaboraDocument.document) {
      throw new RelationshipNotFoundException(
        'Document not found on CollaboraDocument',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }
    if (!collaboraDocument.document.storageBucket) {
      throw new RelationshipNotFoundException(
        'Storage bucket not found on CollaboraDocument backing document',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }

    const oldDocumentId = collaboraDocument.document.id;
    const storageBucketId = collaboraDocument.document.storageBucket.id;

    // FR-013 active-edit guard (fail-closed inside the adapter). The WOPI
    // file_id is the file-service Document id.
    const locked = await this.wopiServiceAdapter.getLockStatus(oldDocumentId);
    if (locked) {
      throw new ValidationException(
        'This document is currently being edited. Please try again once no one is editing.',
        LogContext.COLLABORATION
      );
    }

    // Stage the replacement bytes into the SAME bucket as the current file.
    // temporaryLocation:true so a downstream failure can roll the row back;
    // COLLABORA_SUPPORTED_MIMES enforces the allowlist and triggers the
    // content-sniff; the bucket's maxFileSize enforces the size cap;
    // skipDedup:true so this doc owns its own backing row.
    const newDocument =
      await this.storageBucketService.uploadFileAsDocumentFromBuffer(
        storageBucketId,
        buffer,
        filename,
        mimetype,
        userID,
        true, // temporaryLocation
        true, // skipDedup
        COLLABORA_SUPPORTED_MIMES
      );

    // From here on, any failure must roll back the freshly-staged file and
    // leave the original document + file untouched (FR-008).
    try {
      // FR-006 same-type rule. The sniffed MIME (authoritative) must map to
      // the SAME documentType as the existing document; otherwise reject.
      const sniffedMime = newDocument.mimeType;
      const derivedType = this.documentTypeFromSniffedMimeOrFail(sniffedMime);
      if (derivedType !== collaboraDocument.documentType) {
        throw new ValidationException(
          `The replacement must be the same kind of document as the original (${collaboraDocument.documentType}). The uploaded file is a ${derivedType}.`,
          LogContext.COLLABORATION
        );
      }

      // Finalize the new file out of temp BEFORE re-pointing, mirroring the
      // create flow: the new file is permanent and self-contained before the
      // FK commit, so a save failure leaves an orphan permanent file (cleaned
      // up below) rather than a saved entity pointing at a still-temp file.
      await this.fileServiceAdapter.updateDocument(newDocument.id, {
        temporaryLocation: false,
      });

      // Re-point the FK. originalMimeType tracks the actual sniffed MIME so
      // the rename/extension logic stays correct (documentType is unchanged).
      collaboraDocument.document = newDocument;
      collaboraDocument.originalMimeType = sniffedMime;
      await this.collaboraDocumentRepository.save(
        collaboraDocument as CollaboraDocument
      );
    } catch (error) {
      // Compensate: drop the freshly-staged file (deleteDocument works on both
      // temporary and permanent rows). The original document + file are still
      // referenced and intact.
      await this.fileServiceAdapter
        .deleteDocument(newDocument.id)
        .catch(() => undefined);
      throw error;
    }

    // FR-010: release the old backing file only AFTER the new one is finalized
    // and the FK re-pointed. Best-effort — the document is already valid on the
    // new file, so a delete failure only leaves an orphan old row.
    try {
      await this.documentService.deleteDocument({ ID: oldDocumentId });
    } catch (cleanupError) {
      this.logger.warn?.(
        `Failed to delete old backing file ${oldDocumentId} after replacing CollaboraDocument ${collaboraDocumentID}: ${String(cleanupError)}`,
        LogContext.COLLABORATION
      );
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
