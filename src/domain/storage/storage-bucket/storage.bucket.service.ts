import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IDocument } from '../document/document.interface';
import { Document } from '../document/document.entity';
import { DocumentService } from '../document/document.service';
import { StorageBucket } from './storage.bucket.entity';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketArgsDocuments } from './dto/storage.bucket.args.documents';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  MimeFileType,
} from '@common/enums/mime.file.type';
import { CreateDocumentInput } from '../document/dto/document.dto.create';
import { Readable } from 'stream';
import { ValidationException } from '@common/exceptions';
import { streamToBuffer } from '@common/utils';
import { CreateStorageBucketInput } from './dto/storage.bucket.dto.create';
import { Profile } from '@domain/common/profile/profile.entity';
import { IStorageBucketParent } from './dto/storage.bucket.dto.parent';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { ProfileType } from '@common/enums';
import { StorageUploadFailedException } from '@common/exceptions/storage/storage.upload.failed.exception';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { VisualType } from '@common/enums/visual.type';
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
    private profileRepository: Repository<Profile>
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

  public async save(storage: IStorageBucket): Promise<IStorageBucket> {
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
    const buffer = await streamToBuffer(readStream);

    return await this.uploadFileAsDocumentFromBuffer(
      storageBucketId,
      buffer,
      filename,
      mimeType,
      userID,
      temporaryDocument
    );
  }

  public async uploadFileAsDocumentFromBuffer(
    storageBucketId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userID: string,
    temporaryLocation = false
  ): Promise<IDocument> {
    const storage = await this.getStorageBucketOrFail(storageBucketId, {
      relations: {},
    });

    this.validateMimeTypes(storage, mimeType);

    // Upload the document
    const size = buffer.length;
    this.validateSize(storage, size);
    const externalID = await this.documentService.uploadFile(buffer, filename);

    const createDocumentInput: CreateDocumentInput = {
      mimeType: mimeType as MimeFileType,
      externalID: externalID,
      displayName: filename,
      size: size,
      createdBy: userID || undefined,
      temporaryLocation: temporaryLocation,
    };

    try {
      const docByExternalId =
        await this.documentService.getDocumentByExternalIdOrFail(externalID, {
          where: {
            storageBucket: {
              id: storageBucketId,
            },
          },
        });
      if (docByExternalId) {
        return docByExternalId;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* just consume */
    }

    const document =
      await this.documentService.createDocument(createDocumentInput);
    document.storageBucket = storage;

    this.logger.verbose?.(
      `Uploaded document '${document.externalID}' on storage bucket: ${storage.id}`,
      LogContext.STORAGE_BUCKET
    );
    return await this.documentService.save(document);
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
    agentInfo: AgentInfo
  ): Promise<IDocument[]> {
    const storageLoaded = await this.getStorageBucketOrFail(storage.id, {
      relations: { documents: true },
    });
    const allDocuments = storageLoaded.documents;
    if (!allDocuments)
      throw new EntityNotFoundException(
        `Storage not initialised, no documents: ${storage.id}`,
        LogContext.STORAGE_BUCKET
      );

    // First filter the documents the current user has READ privilege to
    const readableDocuments = allDocuments.filter(document =>
      this.hasAgentAccessToDocument(document, agentInfo)
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
    agentInfo: AgentInfo
  ): boolean {
    return this.authorizationService.isAccessGranted(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ
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
    userId: string
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

    const storageBucket = await this.getStorageBucketOrFail(storageBucketId);
    document.storageBucket = storageBucket;

    return await this.documentService.saveDocument(document);
  }
}
