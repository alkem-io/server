import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class ProfileDocumentsService {
  constructor(
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private documentAuthorizationService: DocumentAuthorizationService,
    private fileServiceAdapter: FileServiceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /***
   * Checks if a url is living under the storage bucket
   * of a profile and re-uploads it if not there
   * @param fileUrl The url of the file to check
   * @param storageBucket The StorageBucket in which the file should be
   * @param internalUrlRequired If true, the file must be inside Alkemio: if the url passed is outside Alkemio will return undefined.
   * If false, the file can be outside Alkemio: if the url passed is outside Alkemio will return the same url (will never download it, just let it pass)
   * @throws {EntityNotFoundException} If the document is not found
   */
  public async reuploadFileOnStorageBucket(
    fileUrl: string,
    storageBucket: IStorageBucket,
    internalUrlRequired: boolean = false
  ): Promise<string | undefined> {
    if (!this.documentService.isAlkemioDocumentURL(fileUrl)) {
      // If image is not inside Alkemio just return url (or undefined if image needs to be inside Alkemio, but never refetch it)
      if (internalUrlRequired) {
        return undefined;
      } else {
        return fileUrl;
      }
    }

    if (!storageBucket.documents) {
      throw new EntityNotInitializedException(
        `Documents not initialized on storage bucket: '${storageBucket.id}'`,
        LogContext.PROFILE
      );
    }

    const docInContent = await this.documentService.getDocumentFromURL(
      fileUrl,
      {
        relations: { storageBucket: true },
      }
    );

    if (!docInContent) {
      throw new EntityNotFoundException(
        `File with URL '${fileUrl}' not found`,
        LogContext.COLLABORATION
      );
    }

    const docInThisBucket = storageBucket.documents.find(
      doc => doc.id === docInContent.id
    );

    if (docInThisBucket) {
      // It should be just `fileUrl` but rewrite it just in case
      return this.documentService.getPubliclyAccessibleURL(docInThisBucket);
    } else if (docInContent.temporaryLocation) {
      // Move temporary document to the new bucket via Go file-service-go
      await this.fileServiceAdapter.updateDocument(docInContent.id, {
        storageBucketId: storageBucket.id,
        temporaryLocation: false,
      });
      // Keep in-memory state in sync so subsequent hits in the same pass
      // find the document in the destination bucket
      docInContent.temporaryLocation = false;
      if (!storageBucket.documents.some(doc => doc.id === docInContent.id)) {
        storageBucket.documents.push(docInContent);
      }
      return this.documentService.getPubliclyAccessibleURL(docInContent);
    } else {
      // Different bucket: fetch content from Go service, re-upload to new bucket
      const content = await this.fileServiceAdapter.getDocumentContent(
        docInContent.id
      );
      const newDoc =
        await this.storageBucketService.uploadFileAsDocumentFromBuffer(
          storageBucket.id,
          content,
          docInContent.displayName,
          docInContent.mimeType,
          docInContent.createdBy
        );
      try {
        await this.documentAuthorizationService.applyAuthorizationPolicy(
          newDoc,
          storageBucket.authorization
        );
      } catch (error) {
        // Compensate: delete the uploaded document to avoid orphan without auth
        try {
          await this.documentService.deleteDocument({ ID: newDoc.id });
        } catch (_cleanupError) {
          this.logger.warn?.(
            `Failed to clean up document ${newDoc.id} after auth policy failure`,
            LogContext.STORAGE_BUCKET
          );
        }
        throw error;
      }
      return this.documentService.getPubliclyAccessibleURL(newDoc);
    }
  }

  /***
   * Checks if a markdown text has documents living under the
   * specified storage bucket and re-uploads them if not there.
   */
  public async reuploadDocumentsInMarkdownToStorageBucket(
    markdown: string,
    storageBucket: IStorageBucket
  ): Promise<string> {
    const baseUrl = this.documentService.getDocumentsBaseUrlPath() + '/';
    const escapedBaseUrl = this.escapeRegExp(baseUrl);
    const uuidPattern =
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    const regex = new RegExp(`${escapedBaseUrl}(${uuidPattern})`, 'ig');

    const matches = markdown.match(regex);
    if (matches?.length) {
      for (const match of matches) {
        const newUrl = await this.reuploadFileOnStorageBucket(
          match,
          storageBucket,
          false
        );
        if (newUrl && newUrl !== match) {
          markdown = this.replaceAll(markdown, match, newUrl);
        }
      }
    }

    return markdown;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private replaceAll(str: string, search: string, replace: string): string {
    const escapedSearch = this.escapeRegExp(search);
    const regexMatch = new RegExp(escapedSearch, 'g');
    return str.replace(regexMatch, replace);
  }
}
