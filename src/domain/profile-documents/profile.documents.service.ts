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
      // Different bucket: COPY the doc into the destination bucket.
      // Source is left intact — never delete it from the helper. The
      // previous MOVE semantics (copy + delete-source) destroyed the
      // source's content during clone flows: when a Space was created
      // from a Template (or a Template from a source Space), edits on
      // the cloned WB / profile would silently delete the original
      // doc, breaking the source's WB visuals and leaving subsequent
      // clones from the same Template referencing now-gone docs (404
      // visuals on later space-from-template creations).
      //
      // Source ownership is the caller's concern — if a flow needs
      // true MOVE semantics (e.g. an admin migration tool, or the
      // temp-doc-to-permanent special case above), it can call
      // FileServiceAdapter.deleteDocument explicitly after this
      // helper returns. The helper itself stays neutral: copy what
      // we need into the destination, leave the source for whoever
      // owns it.
      //
      // skipDedup=true: without it, dedup-reuse could return another
      // caller's existing row, which would silently bind the new
      // bucket's reference to a doc owned by someone else. Forcing a
      // fresh row guarantees `newDoc` is exclusively ours.
      const newDoc = await this.storageBucketService.copyDocumentToBucket(
        storageBucket.id,
        docInContent,
        undefined,
        true
      );
      // Keep destination bucket's in-memory state coherent so
      // subsequent re-uploads in the same request (e.g. multiple
      // internal URLs in the same markdown) see the new doc and
      // don't trigger a redundant copy.
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
