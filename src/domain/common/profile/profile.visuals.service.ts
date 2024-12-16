import { LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProfileVisualsService {
  constructor(
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService
  ) {}

  public async reuploadDocumentsInMarkdownProfile(
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
        if (newUrl) {
          markdown = this.replaceAll(markdown, match, newUrl);
        }
      }
    }

    return markdown;
  }

  /***
   * Checks if a url is living under the storage bucket
   * of a profile and re-uploads it if not there
   * @param fileUrl The url of the file to check
   * @param storageBucket The StorageBucket in which the file should be
   * @param internalUrlRequired If true, the file must be inside Alkemio: if the url passed is outside Alkemio will return undefined.
   *                            If false, the file can be outside Alkemio: if the url passed is outside Alkemio will return the same url (never download it)
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
      throw new NotFoundException(
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
      // If it was temporary just move the document to the new bucket
      docInContent.storageBucket = storageBucket;
      docInContent.temporaryLocation = false;
      storageBucket.documents.push(docInContent);
      return this.documentService.getPubliclyAccessibleURL(docInContent);
    } else {
      // if not in this bucket - create it inside it
      const newDoc = await this.documentService.createDocument({
        createdBy: docInContent.createdBy, // TODO: This should be the current user
        displayName: docInContent.displayName,
        externalID: docInContent.externalID, // Point to the same content
        mimeType: docInContent.mimeType,
        size: docInContent.size,
        temporaryLocation: false,
      });
      storageBucket.documents.push(newDoc);
      await this.storageBucketService.addDocumentToStorageBucketOrFail(
        storageBucket,
        newDoc
      );
      return this.documentService.getPubliclyAccessibleURL(newDoc);
    }
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
