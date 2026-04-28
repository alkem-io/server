import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable } from '@nestjs/common';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';

@Injectable()
export class ProfileDocumentsService {
  constructor(
    private documentService: DocumentService,
    private storageBucketService: StorageBucketService,
    private fileServiceAdapter: FileServiceAdapter
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

    // Precondition: every path past here either calls file-service-go with
    // the bucket id as an FK, or scans `bucket.documents` for an existing
    // entry. Both fail incoherently on an unsaved bucket. Catch misuse here
    // with a clear error rather than letting it surface from deep inside
    // the storage-bucket service as "StorageBucket not found: undefined".
    if (!storageBucket.id) {
      throw new EntityNotInitializedException(
        'Storage bucket must be persisted before document re-upload: caller must save the parent entity first (typically via parent.save() with cascade)',
        LogContext.PROFILE
      );
    }

    // Precondition: every path past here invokes file-service-go with the
    // bucket id as an FK. Catch unsaved-bucket misuse here rather than
    // letting it surface as a confusing "StorageBucket not found: undefined"
    // from deep inside StorageBucketService.uploadFileAsDocumentFromBuffer.
    if (!storageBucket.id) {
      throw new EntityNotInitializedException(
        'Storage bucket must be persisted before document re-upload: caller must save the parent entity first (typically via parent.save() with cascade)',
        LogContext.PROFILE
      );
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
        'File with URL not found',
        LogContext.COLLABORATION,
        { fileUrl }
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
      // Different bucket: ask file-service-go to materialize a new row in
      // the destination bucket pointing at the same content. Single RPC,
      // no bytes on the wire (content is content-addressed). After the
      // new row is in place, delete the source so it doesn't leak as an
      // orphan in its original bucket.
      //
      // skipDedup=true is critical for safety: without it, dedup-reuse could
      // return another caller's existing row, and the rollback below would
      // delete THEIR document on source-delete failure. Forcing a fresh row
      // guarantees `newDoc` is exclusively ours.
      const newDoc = await this.storageBucketService.copyDocumentToBucket(
        storageBucket.id,
        docInContent,
        undefined,
        true
      );
      try {
        await this.documentService.deleteDocument({ ID: docInContent.id });
      } catch (error) {
        // Source delete failed after destination copy succeeded — compensate
        // by removing the new copy so a caller retry doesn't accumulate
        // duplicates in the destination bucket. Swallow cleanup errors: the
        // original delete failure is what the caller needs to see.
        await this.documentService
          .deleteDocument({ ID: newDoc.id })
          .catch(() => undefined);
        throw error;
      }
      // Keep in-memory bucket state in sync so subsequent re-uploads in the
      // same request (e.g. multiple internal URLs in the same markdown) see
      // the moved doc and don't trigger redundant copy/delete churn.
      const sourceIndex = storageBucket.documents.findIndex(
        doc => doc.id === docInContent.id
      );
      if (sourceIndex !== -1) {
        storageBucket.documents.splice(sourceIndex, 1);
      }
      if (!storageBucket.documents.some(doc => doc.id === newDoc.id)) {
        storageBucket.documents.push(newDoc);
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
