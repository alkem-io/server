import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IDocument } from '../document/document.interface';
import { DocumentService } from '../document/document.service';
import { StorageSpace } from './storage.space.entity';
import { IStorageSpace } from './storage.space.interface';
import { CreateDocumentOnStorageSpaceInput } from './dto/storage.space.dto.create.document';
import { StorageSpaceArgsDocuments } from './dto/storage.space..args.documents';

@Injectable()
export class StorageSpaceService {
  constructor(
    private documentService: DocumentService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private namingService: NamingService,
    @InjectRepository(StorageSpace)
    private storageRepository: Repository<StorageSpace>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createStorageSpace(): Promise<IStorageSpace> {
    const storage: IStorageSpace = new StorageSpace();
    storage.authorization = new AuthorizationPolicy();
    storage.documents = [];

    return await this.storageRepository.save(storage);
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

    return await this.storageRepository.remove(storage as StorageSpace);
  }

  async getStorageSpaceOrFail(
    storageID: string,
    options?: FindOneOptions<StorageSpace>
  ): Promise<IStorageSpace | never> {
    const storage = await this.storageRepository.findOne({
      where: { id: storageID },
      ...options,
    });
    if (!storage)
      throw new EntityNotFoundException(
        `StorageSpace not found: ${storageID}`,
        LogContext.CALENDAR
      );
    return storage;
  }

  public async getDocuments(storage: IStorageSpace): Promise<IDocument[]> {
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

    if (documentData.nameID && documentData.nameID.length > 0) {
      const documentWithNameID = storage.documents.find(
        e => e.nameID === documentData.nameID
      );
      if (documentWithNameID)
        throw new ValidationException(
          `Unable to create Document: the provided nameID is already taken: ${documentData.nameID}`,
          LogContext.CALENDAR
        );
    } else {
      documentData.nameID = this.namingService.createNameID(
        `${documentData.profileData?.displayName}`
      );
    }
    const document = await this.documentService.createDocument(
      documentData,
      userID
    );
    storage.documents.push(document);
    await this.storageRepository.save(storage);

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
    const allEvents = storageLoaded.documents;
    if (!allEvents)
      throw new EntityNotFoundException(
        `Space not initialised, no documents: ${storage.id}`,
        LogContext.CALENDAR
      );

    // First filter the documents the current user has READ privilege to
    const readableEvents = allEvents.filter(document =>
      this.hasAgentAccessToEvent(document, agentInfo)
    );

    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: IDocument[] = [];
      for (const documentID of args.IDs) {
        const document = readableEvents.find(
          e => e.id === documentID || e.nameID === documentID
        );

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
      return limitAndShuffle(readableEvents, args.limit, false);
    }

    return readableEvents;
  }

  private hasAgentAccessToEvent(
    document: IDocument,
    agentInfo: AgentInfo
  ): boolean {
    return this.authorizationService.isAccessGranted(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ
    );
  }
}
