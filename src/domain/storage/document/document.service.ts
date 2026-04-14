import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { Document } from './document.entity';
import { IDocument } from './document.interface';
import { DeleteDocumentInput } from './dto/document.dto.delete';
import { UpdateDocumentInput } from './dto/document.dto.update';

@Injectable()
export class DocumentService {
  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private fileServiceAdapter: FileServiceAdapter
  ) {}

  public async deleteDocument(
    deleteData: DeleteDocumentInput
  ): Promise<IDocument> {
    const documentID = deleteData.ID;
    // Read document before deletion (for return value)
    const document = await this.getDocumentOrFail(documentID);

    // Delegate deletion to Go file-service-go
    const deleteResult =
      await this.fileServiceAdapter.deleteDocument(documentID);

    // Clean up server-owned entities using IDs from Go service response
    if (deleteResult.authorizationId) {
      try {
        await this.authorizationPolicyService.delete({
          id: deleteResult.authorizationId,
        } as any);
      } catch (_error) {
        this.logger.warn?.(
          `Failed to delete auth policy ${deleteResult.authorizationId} after document deletion`,
          LogContext.STORAGE_BUCKET
        );
      }
    }
    if (deleteResult.tagsetId) {
      try {
        await this.tagsetService.removeTagset(deleteResult.tagsetId);
      } catch (_error) {
        this.logger.warn?.(
          `Failed to delete tagset ${deleteResult.tagsetId} after document deletion`,
          LogContext.STORAGE_BUCKET
        );
      }
    }

    document.id = documentID;
    return document;
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

  public async updateDocument(
    documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    const document = await this.getDocumentOrFail(documentData.ID, {
      relations: { tagset: true },
    });

    // Tagset is server-managed — update via tagset service (not Go file-service)
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

    return document;
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
}
