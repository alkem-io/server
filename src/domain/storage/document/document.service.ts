import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { tryRollback } from '@common/utils';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, In, Repository } from 'typeorm';
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

    // Clean up server-owned entities using IDs from Go service response.
    // Bind narrowed IDs into const locals so the closures don't re-widen them.
    const authorizationId = deleteResult.authorizationId;
    if (authorizationId) {
      await tryRollback(
        () => this.authorizationPolicyService.deleteById(authorizationId),
        `Failed to delete auth policy ${authorizationId} after document deletion`,
        this.logger,
        LogContext.STORAGE_BUCKET
      );
    }
    const tagsetId = deleteResult.tagsetId;
    if (tagsetId) {
      await tryRollback(
        () => this.tagsetService.removeTagset(tagsetId),
        `Failed to delete tagset ${tagsetId} after document deletion`,
        this.logger,
        LogContext.STORAGE_BUCKET
      );
    }

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
        'Not able to locate document with the specified ID',
        LogContext.STORAGE_BUCKET,
        { documentID }
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
        'Not able to locate document with the specified external id',
        LogContext.STORAGE_BUCKET,
        { externalID }
      );
    return document;
  }

  /**
   * Batch-resolve the documents carrying the given opaque `externalReference`s
   * WITHIN one storage bucket, in a SINGLE query (feature 013, C1).
   *
   * `(externalReference, storageBucketId)` is partially UNIQUE
   * (`UQ_file_externalReference_storageBucketId`, `WHERE "externalReference" IS
   * NOT NULL`), so each reference resolves to at most one document per bucket
   * and the result maps 1:1 onto the requested references.
   *
   * This is the SERVER-SIDE equivalent of file-service's
   * `GET /internal/file/by-reference?ref=…&bucketId=…`, and exists because the
   * message read path needs it once per attachment on an UNPAGINATED history
   * read: the HTTP lookup is accounted against the SHARED file-service circuit
   * breaker, so fanning it out per attachment let a normal chat load trip the
   * breaker that guards uploads platform-wide. `externalReference` is mapped
   * read-only on the Document entity and the `file` table is the same database,
   * so the read is exact — no cache, no staleness.
   *
   * `authorization` is requested explicitly (it is also eager) because callers
   * READ-gate the returned documents.
   */
  public async getDocumentsByReferencesInBucket(
    storageBucketId: string,
    externalReferences: string[]
  ): Promise<IDocument[]> {
    if (externalReferences.length === 0) {
      return [];
    }
    return this.documentRepository.find({
      where: {
        externalReference: In(externalReferences),
        storageBucket: { id: storageBucketId },
      },
      relations: { authorization: true },
    });
  }

  public async getUploadedDate(documentID: string): Promise<Date> {
    const document = await this.documentRepository.findOne({
      where: { id: documentID },
    });
    if (!document)
      throw new EntityNotFoundException(
        'Not able to locate document with the specified ID',
        LogContext.STORAGE_BUCKET,
        { documentID }
      );
    return document.createdDate;
  }

  public async updateDocument(
    documentData: UpdateDocumentInput
  ): Promise<IDocument> {
    // The file-service-go does not support updating display name or other
    // document metadata via PATCH — it only supports storageBucketId and
    // temporaryLocation (used internally by the temporary-storage flow).
    // Fail loudly here rather than silently dropping the input so clients
    // don't assume success when no update happened.
    if (documentData.displayName !== undefined) {
      throw new ValidationException(
        'Document display name cannot be updated via this mutation',
        LogContext.STORAGE_BUCKET
      );
    }

    const document = await this.getDocumentOrFail(documentData.ID, {
      relations: { tagset: true },
    });

    // Tagset is server-managed — update via tagset service (not Go file-service)
    if (documentData.tagset) {
      if (!document.tagset) {
        throw new EntityNotFoundException(
          'Document not initialised',
          LogContext.STORAGE_BUCKET,
          { documentID: document.id }
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
