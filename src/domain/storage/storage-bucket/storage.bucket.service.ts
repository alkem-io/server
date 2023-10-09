import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication/agent-info';
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
import { MimeFileType } from '@common/enums/mime.file.type';
import { CreateDocumentInput } from '../document/dto/document.dto.create';
import { ReadStream } from 'fs';
import { ValidationException } from '@common/exceptions';
import { IVisual } from '@domain/common/visual/visual.interface';
import { VisualService } from '@domain/common/visual/visual.service';
import { streamToBuffer } from '@common/utils';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs/ipfs.upload.exception';
import { CreateStorageBucketInput } from './dto/storage.bucket.dto.create';
import { Profile } from '@domain/common/profile/profile.entity';
import { IStorageBucketParent } from './dto/storage.bucket.dto.parent';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { ProfileType } from '@common/enums';
@Injectable()
export class StorageBucketService {
  DEFAULT_MAX_ALLOWED_FILE_SIZE = 5242880;

  DEFAULT_VISUAL_ALLOWED_MIME_TYPES: MimeFileType[] = [
    MimeFileType.JPG,
    MimeFileType.JPEG,
    MimeFileType.XPNG,
    MimeFileType.PNG,
    MimeFileType.GIF,
    MimeFileType.WEBP,
    MimeFileType.SVG,
    MimeFileType.AVIF,
    MimeFileType.PDF,
  ];

  constructor(
    private documentService: DocumentService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private visualService: VisualService,
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

  public async createStorageBucket(
    storageBucketData?: CreateStorageBucketInput,
    parentStorageBucket?: IStorageBucket
  ): Promise<IStorageBucket> {
    const storage: IStorageBucket = new StorageBucket();
    storage.authorization = new AuthorizationPolicy();
    storage.documents = [];
    storage.allowedMimeTypes =
      storageBucketData?.allowedMimeTypes ||
      this.DEFAULT_VISUAL_ALLOWED_MIME_TYPES;
    storage.maxFileSize =
      storageBucketData?.maxFileSize || this.DEFAULT_MAX_ALLOWED_FILE_SIZE;
    storage.parentStorageBucket = parentStorageBucket;

    return await this.storageBucketRepository.save(storage);
  }

  async deleteStorageBucket(storageID: string): Promise<IStorageBucket> {
    const storage = await this.getStorageBucketOrFail(storageID, {
      relations: ['documents'],
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

    return await this.storageBucketRepository.remove(storage as StorageBucket);
  }

  async getStorageBucketOrFail(
    storageBucketID: string,
    options?: FindOneOptions<StorageBucket>
  ): Promise<IStorageBucket | never> {
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
  ): Promise<IDocument[] | never> {
    const storage = await this.getStorageBucketOrFail(storageInput.id, {
      relations: ['documents'],
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
    readStream: ReadStream,
    filename: string,
    mimeType: string,
    userID: string
  ): Promise<IDocument> {
    const buffer = await streamToBuffer(readStream);

    return await this.uploadFileAsDocumentFromBuffer(
      storageBucketId,
      buffer,
      filename,
      mimeType,
      userID
    );
  }

  public async uploadFileAsDocumentFromBuffer(
    storageBucketId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userID: string,
    anonymousReadAccess = false
  ): Promise<IDocument | never> {
    const storage = await this.getStorageBucketOrFail(storageBucketId, {
      relations: ['documents'],
    });
    if (!storage.documents)
      throw new EntityNotInitializedException(
        `StorageBucket (${storage}) not initialised`,
        LogContext.STORAGE_BUCKET
      );

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
      createdBy: userID,
      anonymousReadAccess,
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
    } catch (e) {
      /* just consume */
    }

    const document = await this.documentService.createDocument(
      createDocumentInput
    );

    storage.documents.push(document);
    this.logger.verbose?.(
      `Uploaded document '${document.externalID}' on storage bucket: ${storage.id}`,
      LogContext.STORAGE_BUCKET
    );
    await this.storageBucketRepository.save(storage);

    return document;
  }

  async uploadImageOnVisual(
    visual: IVisual,
    storageBucket: IStorageBucket,
    readStream: ReadStream,
    fileName: string,
    mimetype: string,
    userID: string
  ): Promise<IDocument | never> {
    this.visualService.validateMimeType(visual, mimetype);

    if (!readStream)
      throw new ValidationException(
        'Readstream should be defined!',
        LogContext.COMMUNITY
      );

    const buffer = await streamToBuffer(readStream);

    const { imageHeight, imageWidth } =
      await this.visualService.getImageDimensions(buffer);
    this.visualService.validateImageWidth(visual, imageWidth);
    this.visualService.validateImageHeight(visual, imageHeight);

    try {
      return await this.uploadFileAsDocumentFromBuffer(
        storageBucket.id,
        buffer,
        fileName,
        mimetype,
        userID,
        true
      );
    } catch (error: any) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${error.message}`
      );
    }
  }

  public async size(storage: IStorageBucket): Promise<number> {
    const documentsSize = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.storageBucketId = :storageBucketId', {
        storageBucketId: storage.id,
      })
      .addSelect('SUM(size)', 'totalSize')
      .getRawOne();

    if (!documentsSize || !documentsSize.totalSize) return 0;
    return documentsSize.totalSize;
  }

  public async getFilteredDocuments(
    storage: IStorageBucket,
    args: StorageBucketArgsDocuments,
    agentInfo: AgentInfo
  ): Promise<IDocument[] | never> {
    const storageLoaded = await this.getStorageBucketOrFail(storage.id, {
      relations: ['documents'],
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
  ): void | never {
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

  private validateSize(
    storageBucket: IStorageBucket,
    size: number
  ): void | never {
    if (size > storageBucket.maxFileSize) {
      throw new ValidationException(
        `File size (${size}) exceeds maximum allowed file size for storage bucket: ${storageBucket.maxFileSize}`,
        LogContext.STORAGE_BUCKET
      );
    }
  }

  public async getChildStorageBuckets(
    storageBucket: IStorageBucket
  ): Promise<IStorageBucket[]> {
    const result = await this.storageBucketRepository.find({
      where: {
        parentStorageBucket: {
          id: storageBucket.id,
        },
      },
    });
    if (!result) return [];
    return result;
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
    if (!profile || !profile.type) {
      return null;
    }
    const parentEntity: IStorageBucketParent = {
      id: profile.id,
      type: profile.type as ProfileType,
      displayName: profile.displayName,
      url: await this.urlGeneratorService.generateUrlForProfile(profile),
    };
    return parentEntity;
  }
}
