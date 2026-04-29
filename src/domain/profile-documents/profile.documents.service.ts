import { LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { DocumentService } from '@domain/storage/document/document.service';
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
    private fileServiceAdapter: FileServiceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /***
   * Checks if a url is living under the storage bucket of a profile
   * and re-uploads it if not there.
   *
   * @param fileUrl The url of the file to check
   * @param storageBucket The StorageBucket in which the file should be
   * @param internalUrlRequired If true, the file must be inside Alkemio:
   *   non-Alkemio URLs return undefined.
   *   If false, non-Alkemio URLs pass through unchanged.
   *
   * Return values:
   * - `string` — the resolved URL (may be the same as input if already
   *   in the destination bucket; may be a new URL after re-home or
   *   cross-bucket copy).
   * - `undefined` — handled gracefully by all callers (markdown walker
   *   leaves the URL as-is, references leave their uri unchanged,
   *   visuals get pushed without a uri + a warning). Returned in three
   *   cases: external URL with `internalUrlRequired`, **stale Alkemio
   *   URL whose target document no longer exists** (logged at WARN),
   *   or — historically — an empty string input.
   *
   * Stale URL tolerance: cloning flows (template-from-space, etc.)
   * carry the source's markdown/visuals/references verbatim. If the
   * source content references a document that has since been deleted,
   * we log a warning with the offending url + bucket id and let the
   * caller continue rather than aborting the entire clone on a single
   * dead reference. Other failure modes (file-service-go errors,
   * permissions, infrastructure) still propagate.
   *
   * @throws {EntityNotInitializedException} if the bucket isn't
   *   persisted or its documents relation isn't loaded — that's a
   *   programmer error in the call site, not a runtime data issue.
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
      // Stale/orphan reference — the URL points to an Alkemio doc UUID
      // that no longer exists. Don't throw: callers (markdown walker,
      // references, visuals, etc.) all handle undefined gracefully and
      // we don't want a single dead link to abort entire clone flows.
      this.logger.warn?.(
        {
          message:
            'Reupload skipped: Alkemio document URL points to a non-existent file',
          fileUrl,
          storageBucketId: storageBucket.id,
        },
        LogContext.PROFILE
      );
      return undefined;
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
        // duplicates in the destination bucket. Cleanup-failure is
        // alert-worthy (logger.error) but does not replace the original
        // source-delete error — same convention as the OrRollback helper
        // and other rollback sites in the codebase.
        await this.documentService
          .deleteDocument({ ID: newDoc.id })
          .catch(cleanupError => {
            const stack =
              cleanupError instanceof Error ? (cleanupError.stack ?? '') : '';
            this.logger.error?.(
              {
                message:
                  'Cleanup of destination copy after source-delete failure also failed',
                sourceDocumentId: docInContent.id,
                destinationDocumentId: newDoc.id,
                cleanupError: String(cleanupError),
              },
              stack,
              LogContext.PROFILE
            );
          });
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
   * Walks every Alkemio document URL in the markdown and re-homes it
   * into `storageBucket` via {@link reuploadFileOnStorageBucket}.
   *
   * Stale/dead URLs are tolerated by the helper itself (logged at WARN,
   * returns undefined). When the helper returns undefined or the same
   * URL, we leave the URL untouched in the markdown so the clone
   * preserves the source's shape.
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
