import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { CreateContributionOnCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create.contribution';
import { CreateVirtualContributorOnAccountInput } from '@domain/space/account/dto/account.dto.create.virtual.contributor';
import { CreateCalloutOnCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create.callout';

export type temporaryDocumentDTO =
  | CreateContributionOnCalloutInput
  | CreateCalloutOnCalloutsSetInput
  | CreateVirtualContributorOnAccountInput;
export class TemporaryStorageService {
  private sampleDocumentURL =
    'https://alkem.io/api/private/rest/storage/document/0d4564f7-2194-42e4-b4c1-60314765a3e0';

  constructor(
    private documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  // Takes the provided input, and moved any specified documents
  // to be in the provided storage bucket
  // NOTE: documents are diretly modified so important that any callers of this
  // method reload the Documents afterwards
  public async moveTemporaryDocuments(
    inputDTO: temporaryDocumentDTO,
    destinationStorageBucket: IStorageBucket
  ): Promise<void> {
    const serializedJSON = JSON.stringify(inputDTO);
    const documents = await this.getDocumentsFromString(serializedJSON);
    for (const document of documents) {
      if (document.temporaryLocation) {
        document.storageBucket = destinationStorageBucket;
        document.temporaryLocation = false;
        this.logger.verbose?.(
          `Identified temporary document ${document.id}, moving to storage bucket: ${destinationStorageBucket.id}`,
          LogContext.DOCUMENT
        );
        await this.documentService.save(document);
      }
    }
  }

  // Get an array of documents that are mentioned in the
  // provided input
  private async getDocumentsFromString(
    jsonString: string
  ): Promise<IDocument[]> {
    const documentBaseURlPath = this.documentService.getDocumentsBaseUrlPath();
    const escapedDocumentBaseUrlPth = this.escapeRegExp(documentBaseURlPath);

    // Find all instances in the serializedJSON that match this URL path base
    const regex = new RegExp(`(${escapedDocumentBaseUrlPth}\/)(.{0,36})`, 'g');
    const matches = [...jsonString.matchAll(regex)];
    const results: IDocument[] = [];
    for (const match of matches) {
      const matchedURL = match[1];
      const documentID = match[2];
      try {
        // Avoid errors cascading out
        const document =
          await this.documentService.getDocumentOrFail(documentID);
        results.push(document);
      } catch {
        this.logger.warn(
          `Identified document URL ${matchedURL} for document ${documentID}but could not load it`,
          LogContext.DOCUMENT
        );
      }
    }
    return results;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
