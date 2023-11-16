import { Readable } from 'stream';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DeleteDocumentInput } from './dto/document.dto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';
import { CreateDocumentInput } from './dto/document.dto.create';
import { Document } from './document.entity';
import { IDocument } from './document.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { IpfsService } from '@services/adapters/ipfs/ipfs.service';
import { IpfsUploadFailedException } from '@common/exceptions/ipfs/ipfs.upload.exception';
import { IpfsDeleteFailedException } from '@common/exceptions/ipfs/ipfs.delete.exception';
import { ConfigService } from '@nestjs/config';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

@Injectable()
export class DocumentService {
  constructor(
    private configService: ConfigService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    private ipfsAdapter: IpfsService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createDocument(
    documentInput: CreateDocumentInput
  ): Promise<Document> {
    const document: IDocument = Document.create({ ...documentInput });
    document.tagset = await this.tagsetService.createTagset({
      name: TagsetReservedName.DEFAULT,
      tags: [],
    });

    document.authorization = new AuthorizationPolicy();

    return await this.documentRepository.save(document);
  }

  public async deleteDocument(
    deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const documentID = deleteData.ID;
    const document = await this.getDocumentOrFail(documentID, {
      relations: { tagset: true },
    });
    const DELETE_IPFS_CONTENTS = false;
    if (DELETE_IPFS_CONTENTS) {
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
  ): Promise<IDocument | never> {
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

  public getDocumentContents(document: IDocument): Readable {
    return Readable.from(this.ipfsAdapter.getFileContents(document.externalID));
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
    url: string | undefined
  ): Promise<IDocument | undefined> {
    try {
      const documentsBaseUrlPath = this.getDocumentsBaseUrlPath();
      if (url && url.startsWith(documentsBaseUrlPath)) {
        const documentID = url.substring(documentsBaseUrlPath.length + 1);
        return await this.getDocumentOrFail(documentID);
      }
    } catch (error) {
      return undefined;
    }
    return undefined;
  }

  public isAlkemioDocumentURL(url: string): boolean {
    if (!url) return false;
    return url.startsWith(this.getDocumentsBaseUrlPath());
  }

  private getDocumentsBaseUrlPath(): string {
    const endpoint_cluster = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;
    const private_rest_api_route = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.path_api_private_rest;
    return `${endpoint_cluster}${private_rest_api_route}/storage/document`;
  }

  private async removeFile(CID: string): Promise<boolean> {
    try {
      await this.ipfsAdapter.unpinFile(CID);
      await this.ipfsAdapter.garbageCollect();
    } catch (error) {
      throw new IpfsDeleteFailedException(
        `Ipfs removing file at path ${CID} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
    return true;
  }

  public async uploadFile(buffer: Buffer, fileName: string): Promise<string> {
    try {
      return await this.ipfsAdapter.uploadFileFromBufferCID(buffer);
    } catch (error) {
      throw new IpfsUploadFailedException(
        `Ipfs upload of ${fileName} failed! Error: ${
          (error as Error).message ?? String(error)
        }`
      );
    }
  }
}
