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
import { DocumentService } from '../document/document.service';
import { StorageSpace } from './storage.space.entity';
import { IStorageSpace } from './storage.space.interface';
import { CreateDocumentOnStorageSpaceInput } from './dto/storage.space.dto.create.document';
import { StorageSpaceArgsDocuments } from './dto/storage.space..args.documents';
import { MimeFileType } from '@common/enums/mime.file.type';
@Injectable()
export class StorageSpaceService {
  DEFAULT_MAX_ALLOWED_FILE_SIZE = 5242880;

  DEFAULT_VISUAL_ALLOWED_MIME_TYPES: MimeFileType[] = [
    MimeFileType.JPEG,
    MimeFileType.JPG,
    MimeFileType.GIF,
    MimeFileType.PNG,
    MimeFileType.PNG,
    MimeFileType.SVG,
    MimeFileType.WEBP,
    MimeFileType.XPNG,
  ];

  constructor(
    private documentService: DocumentService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    @InjectRepository(StorageSpace)
    private storageSpaceRepository: Repository<StorageSpace>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createStorageSpace(
    allowedMimeTypes: MimeFileType[],
    maxAllowedFileSize: number
  ): Promise<IStorageSpace> {
    const storage: IStorageSpace = new StorageSpace();
    storage.authorization = new AuthorizationPolicy();
    storage.documents = [];
    storage.allowedMimeTypes = allowedMimeTypes;
    storage.maxFileSize = maxAllowedFileSize;

    return await this.storageSpaceRepository.save(storage);
  }

  async deleteStorageSpace(storageID: string): Promise<IStorageSpace> {
    const storage = await this.getStorageSpaceOrFail(storageID, {
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

    return await this.storageSpaceRepository.remove(storage as StorageSpace);
  }

  async getStorageSpaceOrFail(
    storageSpaceID: string,
    options?: FindOneOptions<StorageSpace>
  ): Promise<IStorageSpace | never> {
    const storageSpace = await this.storageSpaceRepository.findOne({
      where: { id: storageSpaceID },
      ...options,
    });
    if (!storageSpace)
      throw new EntityNotFoundException(
        `StorageSpace not found: ${storageSpaceID}`,
        LogContext.CALENDAR
      );
    return storageSpace;
  }

  public async getDocuments(storageInput: IStorageSpace): Promise<IDocument[]> {
    const storage = await this.getStorageSpaceOrFail(storageInput.id, {
      relations: ['documents'],
    });
    const documents = storage.documents;
    if (!documents)
      throw new EntityNotFoundException(
        `Undefined storage documents found: ${storage.id}`,
        LogContext.CALENDAR
      );

    return documents;
  }

  public async createDocument(
    documentData: CreateDocumentOnStorageSpaceInput,
    userID: string
  ): Promise<IDocument> {
    const storage = await this.getStorageSpaceOrFail(documentData.storageID, {
      relations: ['documents'],
    });
    if (!storage.documents)
      throw new EntityNotInitializedException(
        `StorageSpace (${storage}) not initialised`,
        LogContext.CALENDAR
      );

    const document = await this.documentService.createDocument(
      documentData,
      userID
    );
    storage.documents.push(document);
    await this.storageSpaceRepository.save(storage);

    return document;
  }

  public async getDocumentsArgs(
    storage: IStorageSpace,
    args: StorageSpaceArgsDocuments,
    agentInfo: AgentInfo
  ): Promise<IDocument[]> {
    const storageLoaded = await this.getStorageSpaceOrFail(storage.id, {
      relations: ['documents'],
    });
    const allDocuments = storageLoaded.documents;
    if (!allDocuments)
      throw new EntityNotFoundException(
        `Space not initialised, no documents: ${storage.id}`,
        LogContext.CALENDAR
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
            `Document with requested ID (${documentID}) not located within current StorageSpace: ${storage.id}`,
            LogContext.CALENDAR
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
    storageSpace: IStorageSpace,
    mimeType: MimeFileType
  ): boolean {
    return storageSpace.allowedMimeTypes.includes(mimeType);
  }
}
