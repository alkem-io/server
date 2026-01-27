import { STORAGE_SERVICE } from '@common/constants';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { EntityNotFoundException } from '@common/exceptions';
import { DocumentDeleteFailedException } from '@common/exceptions/document/document.delete.failed.exception';
import { DocumentSaveFailedException } from '@common/exceptions/document/document.save.failed.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageService } from '@services/adapters/storage';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Readable } from 'stream';
import { FindOneOptions, Repository } from 'typeorm';
import { Document } from './document.entity';
import { IDocument } from './document.interface';
import { CreateDocumentInput } from './dto/document.dto.create';
import { DeleteDocumentInput } from './dto/document.dto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';

@Injectable()
export class DocumentService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    @Inject(STORAGE_SERVICE)
    private storageService: StorageService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createDocument(
    documentInput: CreateDocumentInput
  ): Promise<IDocument> {
    const document: IDocument = Document.create({ ...documentInput });
    document.tagset = this.tagsetService.createTagset({
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    document.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.DOCUMENT
    );

    return await this.documentRepository.save(document);
  }

  public async deleteDocument(
    deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const documentID = deleteData.ID;
    const document = await this.getDocumentOrFail(documentID, {
      relations: { tagset: true },
    });
    const DELETE_FILE = false;
    if (DELETE_FILE) {
      // Delete the underlying document
      try {
        await this.removeFile(document.externalID);
      } catch (error: any) {
        this.logger.error(
          `Unable to delete underlying file for document '${documentID}': ${error}`,
          error?.stack,
          LogContext.STORAGE_BUCKET
        );
      }
    }

    if (document.authorization) {
      await this.authorizationPolicyService.delete(document.authorization);
    }
    if (document.tagset) {
      await this.tagsetService.removeTagset(document.tagset.id);
    }

    const result = await this.documentRepository.remove(document as Document);
    result.id = documentID;
    return result;
  }

  public async getDocumentOrFail(
    documentID: string,
    options?: FindOneOptions<Document>
  ): Promise<IDocument> {
    const document = await this.documentRepository.findOne({
      where: {
        ...options?.where,
        id: documentID,
      },
      ...options,
    });
    if (!document)
      throw new EntityNotFoundException(
        `Not able to locate document with the specified ID: ${documentID}`,
        LogContext.STORAGE_BUCKET
      );
    return document;
  }

  public async getDocumentByExternalIdOrFail(
    externalID: string,
    { where, ...rest }: FindOneOptions<Document>
  ) {
    const document = await this.documentRepository.findOne({
      where: {
        ...where,
        externalID,
      },
      ...rest,
    });
    if (!document)
      throw new EntityNotFoundException(
        `Not able to locate document with the specified external id: ${externalID}`,
        LogContext.STORAGE_BUCKET
      );
    return document;
  }

  public async save(document: IDocument): Promise<IDocument> {
    return await this.documentRepository.save(document);
  }

  public async getUploadedDate(documentID: string): Promise<Date> {
    const document = await this.documentRepository.findOne({
      where: { id: documentID },
    });
    if (!document)
      throw new EntityNotFoundException(
        `Not able to locate document with the specified ID: ${documentID}`,
        LogContext.STORAGE_BUCKET
      );
    return document.createdDate;
  }

  /**
   * Retrieves the contents of a document as a Readable stream.
   * @throws {Error} if the storage service fails to read the document.
   */
  public async getDocumentContents(document: IDocument): Promise<Readable> {
    const content = await this.storageService.read(document.externalID);
    return Readable.from(content);
  }

  public async updateDocument(
    documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    const document = await this.getDocumentOrFail(documentData.ID, {
      relations: { tagset: true },
    });

    // Copy over the received data
    if (documentData.tagset) {
      if (!document.tagset) {
        throw new EntityNotFoundException(
          `Document not initialised: ${document.id}`,
          LogContext.CALENDAR
        );
      }
      document.tagset = await this.tagsetService.updateTagset(
        documentData.tagset
      );
    }

    await this.documentRepository.save(document);

    return document;
  }

  public async saveDocument(document: IDocument): Promise<IDocument> {
    return await this.documentRepository.save(document);
  }

  public getPubliclyAccessibleURL(document: IDocument): string {
    const documentsBaseUrlPath = this.getDocumentsBaseUrlPath();
    return `${documentsBaseUrlPath}/${document.id}`;
  }

  public async getDocumentFromURL(
    url: string,
    options?: FindOneOptions<Document>
  ): Promise<IDocument | undefined> {
    const documentsBaseUrlPath = this.getDocumentsBaseUrlPath();

    if (!this.isAlkemioDocumentURL(url)) {
      return undefined;
    }

    const documentID = url.substring(documentsBaseUrlPath.length + 1);
    try {
      return await this.getDocumentOrFail(documentID, options);
    } catch (error: any) {
      this.logger.error(
        `Unable to find document '${documentID}': ${error}`,
        error?.stack,
        LogContext.STORAGE_BUCKET
      );
    }
    return undefined;
  }

  public isAlkemioDocumentURL(url: string): boolean {
    if (!url) return false;
    return url.startsWith(this.getDocumentsBaseUrlPath());
  }

  public getDocumentsBaseUrlPath(): string {
    const { endpoint_cluster, path_api_private_rest } = this.configService.get(
      'hosting',
      { infer: true }
    );
    return `${endpoint_cluster}${path_api_private_rest}/storage/document`;
  }

  private async removeFile(CID: string): Promise<boolean> {
    try {
      await this.storageService.delete(CID);
    } catch (error: any) {
      throw new DocumentDeleteFailedException(
        `Removing file ${CID} failed!`,
        LogContext.LOCAL_STORAGE,
        {
          message: error?.message,
          originalException: error,
        }
      );
    }
    return true;
  }

  public async uploadFile(buffer: Buffer, fileName: string): Promise<string> {
    try {
      return await this.storageService.save(buffer);
    } catch (error: any) {
      throw new DocumentSaveFailedException(
        `Uploading ${fileName} failed!`,
        LogContext.LOCAL_STORAGE,
        {
          message: error?.message,
          originalException: error,
        }
      );
    }
  }
}
