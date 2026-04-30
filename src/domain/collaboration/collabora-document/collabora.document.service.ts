import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
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
    private wopiServiceAdapter: WopiServiceAdapter
  ) {}

  public async createCollaboraDocument(
    input: CreateCollaboraDocumentInput,
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICollaboraDocument> {
    const collaboraDocument: ICollaboraDocument = new CollaboraDocument();
    collaboraDocument.documentType = input.documentType;
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
    const mimeType = this.getMimeType(input.documentType);
    const fileName = `${input.displayName}${this.getFileExtension(input.documentType)}`;

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
        relations: { profile: true },
      }
    );

    if (!collaboraDocument.profile) {
      throw new RelationshipNotFoundException(
        'Profile not found on CollaboraDocument',
        LogContext.COLLABORATION,
        { collaboraDocumentId: collaboraDocumentID }
      );
    }

    await this.profileService.updateProfile(collaboraDocument.profile, {
      displayName,
    });

    return this.getCollaboraDocumentOrFail(collaboraDocumentID, {
      relations: { profile: true },
    });
  }

  private getMimeType(documentType: CollaboraDocumentType): string {
    const mimeMap: Record<CollaboraDocumentType, string> = {
      [CollaboraDocumentType.SPREADSHEET]:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [CollaboraDocumentType.PRESENTATION]:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [CollaboraDocumentType.TEXT_DOCUMENT]:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[documentType];
  }

  private getFileExtension(documentType: CollaboraDocumentType): string {
    const extMap: Record<CollaboraDocumentType, string> = {
      [CollaboraDocumentType.SPREADSHEET]: '.xlsx',
      [CollaboraDocumentType.PRESENTATION]: '.pptx',
      [CollaboraDocumentType.TEXT_DOCUMENT]: '.docx',
    };
    return extMap[documentType];
  }
}
