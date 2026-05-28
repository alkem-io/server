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
        const derivedType = MIME_TO_DOCUMENT_TYPE[originalMimeType];
        if (!derivedType) {
          // file-service-go's allowlist matched COLLABORA_SUPPORTED_MIMES,
          // so this would be a bug in our static maps.
          throw new RelationshipNotFoundException(
            'Imported file MIME not in CollaboraDocument category map',
            LogContext.COLLABORATION,
            { sniffedMime: originalMimeType }
          );
        }
        documentType = derivedType;
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
