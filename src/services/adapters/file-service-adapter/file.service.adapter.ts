import { LogContext } from '@common/enums';
import {
  HttpClientBase,
  type HttpClientBaseConfig,
} from '@common/http/http.client.base';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isAxiosError } from 'axios';
import FormData from 'form-data';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { Readable, Transform } from 'stream';
import type {
  ContentBatchItemResult,
  ContentBatchResponse,
  CopyDocumentInput,
  CreateDocumentMetadata,
  CreateDocumentResult,
  DeleteDocumentResult,
  DocumentReferenceResult,
  UpdateDocumentInput,
  UpdateDocumentResult,
} from './dto';
import {
  FileServiceAdapterException,
  StorageServiceUnavailableException,
} from './file.service.adapter.exception';

const LOG_PREFIX = '[FileService]';
const FILE_PATH_PREFIX = '/internal/file';

// Snapshot uploads mirror the collaboration-service BlobStore (store.go): a fixed
// display name + a `.ybin` filename, so create-time and collab-saved snapshots are
// indistinguishable in the bucket.
const SNAPSHOT_FILENAME = 'snapshot.ybin';
const SNAPSHOT_DISPLAY_NAME = 'collaboration-snapshot';

@Injectable()
export class FileServiceAdapter extends HttpClientBase {
  private readonly enabled: boolean;

  constructor(
    httpService: HttpService,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    logger: LoggerService
  ) {
    const config: HttpClientBaseConfig = {
      baseUrl: configService.get('storage.file_service.url', { infer: true }),
      timeout: configService.get('storage.file_service.timeout', {
        infer: true,
      }),
      retries: configService.get('storage.file_service.retries', {
        infer: true,
      }),
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeMs: 30_000,
      },
      logContext: LogContext.STORAGE_BUCKET,
      logPrefix: LOG_PREFIX,
    };
    super(httpService, logger, config);

    this.enabled = configService.get('storage.file_service.enabled', {
      infer: true,
    });
  }

  /** The non-file multipart fields, shared by the buffer and stream paths. */
  private appendDocumentMetadata(
    form: FormData,
    metadata: CreateDocumentMetadata
  ): void {
    form.append('displayName', metadata.displayName);
    form.append('storageBucketId', metadata.storageBucketId);
    form.append('authorizationId', metadata.authorizationId);
    if (metadata.tagsetId) {
      form.append('tagsetId', metadata.tagsetId);
    }
    if (metadata.createdBy) {
      form.append('createdBy', metadata.createdBy);
    }
    if (metadata.temporaryLocation !== undefined) {
      form.append(
        'temporaryLocation',
        metadata.temporaryLocation ? 'true' : 'false'
      );
    }
    if (metadata.allowedMimeTypes) {
      form.append('allowedMimeTypes', metadata.allowedMimeTypes);
    }
    if (metadata.maxFileSize !== undefined) {
      form.append('maxFileSize', String(metadata.maxFileSize));
    }
    if (metadata.skipDedup) {
      form.append('skipDedup', 'true');
    }
  }

  /**
   * Streaming counterpart of `createDocument`: the bytes flow
   * request -> multipart -> file-service without ever being held whole in
   * memory. Used by the upload path, which starts from a `Readable`.
   *
   * `maxBytes` is enforced DURING the transfer, so an oversized upload is cut
   * off mid-flight rather than after it has been fully received.
   *
   * Deliberately does NOT go through `sendRequest`: that pipeline retries a
   * POST on 503/504, and by then the request body has been sent, so the
   * stream is exhausted and a replay would transmit a truncated body. One
   * attempt only. Breaker accounting is kept.
   */
  async createDocumentFromStream(
    readStream: Readable,
    metadata: CreateDocumentMetadata,
    maxBytes: number
  ): Promise<CreateDocumentResult> {
    this.checkEnabledAndCircuit('createDocumentFromStream');

    let bytesSeen = 0;
    const cap = new Transform({
      transform(chunk, _encoding, callback) {
        bytesSeen += chunk.length;
        if (maxBytes > 0 && bytesSeen > maxBytes) {
          callback(
            new Error(
              `upload exceeds the maximum allowed size of ${maxBytes} bytes`
            )
          );
          return;
        }
        callback(null, chunk);
      },
    });
    // Propagate a source failure into the capped stream so the request fails
    // rather than silently sending a short body.
    readStream.on('error', err => cap.destroy(err));
    readStream.pipe(cap);

    const form = new FormData();
    form.append('file', cap, {
      filename: metadata.displayName,
      contentType: metadata.mimeType ?? 'application/octet-stream',
    });
    this.appendDocumentMetadata(form, metadata);

    const url = `${this.baseUrl}${FILE_PATH_PREFIX}`;
    try {
      const response = await firstValueFrom(
        this.httpService.post<CreateDocumentResult>(url, form, {
          headers: form.getHeaders(),
          timeout: this.requestTimeout,
          // MUST stay 0. It is the only way to reach axios' native http
          // transport: the default follow-redirects transport pushes every
          // written chunk into `_requestBodyBuffers` to be able to replay the
          // body on a redirect, which holds the whole file in memory and
          // defeats the entire point of this path. The endpoint is a fixed
          // internal one and never redirects.
          maxRedirects: 0,
          // The body length is unknown up front; let axios stream it.
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })
      );
      this.circuitBreaker.onSuccess();
      return response.data;
    } catch (error) {
      this.circuitBreaker.onFailure();
      throw this.handleError('createDocumentFromStream', error, {
        storageBucketId: metadata.storageBucketId,
        displayName: metadata.displayName,
      });
    } finally {
      readStream.destroy();
    }
  }

  /**
   * Create a document in the Go file-service-go.
   * Sends file + metadata as multipart/form-data.
   */
  async createDocument(
    file: Buffer,
    metadata: CreateDocumentMetadata
  ): Promise<CreateDocumentResult> {
    this.checkEnabledAndCircuit('createDocument');

    const form = new FormData();
    form.append('file', file, {
      filename: metadata.displayName,
      // Pass the caller-declared MIME type so the Go service can trust it
      // when content-based detection is inconclusive (e.g. zero-byte files or
      // ambiguous magic bytes). Defaults to generic octet-stream otherwise.
      contentType: metadata.mimeType ?? 'application/octet-stream',
    });
    this.appendDocumentMetadata(form, metadata);

    return this.sendRequest<CreateDocumentResult>(
      'createDocument',
      'post',
      FILE_PATH_PREFIX,
      form,
      form.getHeaders()
    );
  }

  /**
   * Upload a collaboration content SNAPSHOT (a Yjs-V2 state blob) into a
   * document's own storage bucket and return the file-service id, which becomes
   * the document's `contentPointer` (R2/R4, FR-005).
   *
   * This deliberately mirrors the collaboration-service's file-service BlobStore
   * `Put` (Go `internal/adapter/outbound/blobstore/fileservice/store.go`) rather
   * than the server's `createDocument` path: the snapshot is an INTERNAL infra
   * blob whose access is governed by the owning document's own authorization, so
   * `authorizationId` is OMITTED — file-service then writes a NULL authz column
   * (its `UNIQUE(authorizationId)` permits any number of NULLs). The snapshot is
   * therefore pointer-compatible with the ones the collaboration-service writes
   * on every later save (latest-only: the room deletes the previous pointer's
   * file on its first save). It is a real `file` row mapped by the server's
   * `Document` entity, but it is not provisioned as a user-visible document: it
   * has no authorization-policy or tagset rows and is filtered from public
   * document collections and lookups. It still counts toward the space's storage
   * quota because it lives in the document's own bucket under the space's storage
   * aggregator.
   *
   */
  async createSnapshotInBucket(
    snapshot: Buffer,
    storageBucketId: string
  ): Promise<CreateDocumentResult> {
    return this.createInternalDocumentInBucket(
      snapshot,
      storageBucketId,
      SNAPSHOT_DISPLAY_NAME,
      'application/octet-stream',
      { filename: SNAPSHOT_FILENAME }
    );
  }

  async createInternalDocumentInBucket(
    file: Buffer,
    storageBucketId: string,
    displayName: string,
    mimeType: string,
    options: { filename?: string; skipDedup?: boolean } = {}
  ): Promise<CreateDocumentResult> {
    this.checkEnabledAndCircuit('createInternalDocumentInBucket');
    const form = new FormData();
    form.append('file', file, {
      filename: options.filename ?? displayName,
      contentType: mimeType,
    });
    form.append('displayName', displayName);
    form.append('storageBucketId', storageBucketId);
    if (options.skipDedup) form.append('skipDedup', 'true');

    return this.sendRequest<CreateDocumentResult>(
      'createInternalDocumentInBucket',
      'post',
      FILE_PATH_PREFIX,
      form,
      form.getHeaders()
    );
  }

  /**
   * Batched internal content read (file-service `POST /internal/file/content-batch`,
   * file-service #52): N document ids → N content blobs, ORDER PRESERVED (incl.
   * duplicates), per-id misses reported non-fatally. Backs the server's
   * derived-text resolvers (memo `markdown` derived from the stored Yjs snapshot)
   * so a list of snapshot pointers is read in ONE round trip instead of an N+1 of
   * single `getDocumentContent` calls. No per-file authorization (these are the
   * internal NULL-authz snapshot blobs).
   *
   * Returns the raw items in request order; a missing/failed id has
   * `found: false`. Callers map by position (not by id) because the endpoint
   * preserves order and honours duplicates.
   */
  async getContentBatch(ids: string[]): Promise<ContentBatchItemResult[]> {
    this.checkEnabledAndCircuit('getContentBatch');

    // file-service returns 400 for an empty body; short-circuit the empty case
    // so a resolver with no pointers does not make a doomed round trip.
    if (ids.length === 0) {
      return [];
    }

    const response = await this.sendRequest<ContentBatchResponse>(
      'getContentBatch',
      'post',
      `${FILE_PATH_PREFIX}/content-batch`,
      { ids }
    );
    return response.items ?? [];
  }

  /**
   * Copy an existing document into another bucket on file-service-go (v0.0.14+).
   * No bytes traverse the wire — content is content-addressed, the new row
   * just points at the existing blob. Replaces the legacy
   * `getDocumentContent` + `createDocument` round-trip.
   *
   * Per-bucket dedup applies by default; on dedup hit the response carries
   * `reused: true` and the caller-supplied `authorizationId` / `tagsetId`
   * are ignored, matching `createDocument`'s contract.
   */
  async copyDocument(input: CopyDocumentInput): Promise<CreateDocumentResult> {
    this.checkEnabledAndCircuit('copyDocument');

    return this.sendRequest<CreateDocumentResult>(
      'copyDocument',
      'post',
      `${FILE_PATH_PREFIX}/copy`,
      input
    );
  }

  /**
   * Stream file content from the Go file-service-go. Returns the raw bytes
   * as a `Buffer`.
   */
  async getDocumentContent(documentId: string): Promise<Buffer> {
    this.checkEnabledAndCircuit('getDocumentContent');

    return this.sendBinaryRequest(
      'getDocumentContent',
      'get',
      this.fileContentPath(documentId),
      { documentId }
    );
  }

  /**
   * Update mutable document metadata in the Go file-service-go.
   * `storageBucketId`, `temporaryLocation`, and `displayName` are all
   * supported (v0.0.16+). At least one must be present.
   */
  async updateDocument(
    documentId: string,
    patch: UpdateDocumentInput
  ): Promise<UpdateDocumentResult> {
    this.checkEnabledAndCircuit('updateDocument');

    return this.sendRequest<UpdateDocumentResult>(
      'updateDocument',
      'patch',
      this.filePath(documentId),
      patch
    );
  }

  /**
   * Delete a document from the Go file-service-go.
   * Returns `authorizationId` and `tagsetId` so the server can clean up the
   * corresponding auth policy and tagset rows (both server-owned).
   */
  async deleteDocument(documentId: string): Promise<DeleteDocumentResult> {
    this.checkEnabledAndCircuit('deleteDocument');

    return this.sendRequest<DeleteDocumentResult>(
      'deleteDocument',
      'delete',
      this.filePath(documentId)
    );
  }

  /**
   * Re-home a document (feature 013): a single PATCH that moves the row into a
   * new bucket while re-pointing its authorization policy, owner, and opaque
   * reference. This is the primary inbound re-home — move a `matrix_media`
   * staging document into a conversation bucket and mirror membership auth onto
   * it, all in one call. Thin semantic wrapper over the PATCH endpoint.
   */
  async moveDocument(
    documentId: string,
    patch: Pick<
      UpdateDocumentInput,
      | 'storageBucketId'
      | 'authorizationId'
      | 'createdBy'
      | 'externalReference'
      | 'temporaryLocation'
      | 'displayName'
    >
  ): Promise<UpdateDocumentResult> {
    // DELEGATE to updateDocument: identical endpoint/verb/body/return type, so
    // there is ONE PATCH implementation. Re-home callers keep the narrower typed
    // surface via this signature; only the shared transport differs (the
    // operation is logged/circuit-accounted as `updateDocument`).
    return this.updateDocument(documentId, patch);
  }

  /**
   * Resolve a document by its opaque `externalReference` (feature 013).
   *
   * - `bucketId` omitted → global lookup (provider `fetch` form): returns any
   *   document whose `externalReference = ref` (all share one blob). Used to
   *   decide MOVE vs COPY during re-home.
   * - `bucketId` present → bucket-scoped lookup (read resolution): the document
   *   in that bucket carrying the reference.
   *
   * Returns `null` on 404 (no match) rather than throwing.
   */
  async getDocumentByReference(
    ref: string,
    bucketId?: string
  ): Promise<DocumentReferenceResult | null> {
    this.checkEnabledAndCircuit('getDocumentByReference');

    const params = new URLSearchParams({ ref });
    if (bucketId) {
      params.append('bucketId', bucketId);
    }
    const path = `${FILE_PATH_PREFIX}/by-reference?${params.toString()}`;

    try {
      // ref + bucketId are already carried as QUERY params in `path`. They must
      // ride the `context` (6th) arg — NOT `data` (4th) — so this GET issues no
      // body and, on a non-404 failure, the error context still carries
      // ref/bucketId. Positional signature:
      // sendRequest(operation, method, path, data?, headers?, context?).
      return await this.sendRequest<DocumentReferenceResult>(
        'getDocumentByReference',
        'get',
        path,
        undefined,
        undefined,
        { ref, bucketId }
      );
    } catch (error) {
      if (
        error instanceof FileServiceAdapterException &&
        error.httpStatus === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  private filePath(documentId: string): string {
    return `${FILE_PATH_PREFIX}/${documentId}`;
  }

  private fileContentPath(documentId: string): string {
    return `${this.filePath(documentId)}/content`;
  }

  private fileMetaPath(documentId: string): string {
    return `${this.filePath(documentId)}/meta`;
  }

  private checkEnabledAndCircuit(operation: string): void {
    if (!this.enabled) {
      throw new StorageServiceUnavailableException(
        'File service adapter is disabled'
      );
    }
    this.checkCircuit(operation);
  }

  protected openCircuitException(operation: string, resetInMs: number): Error {
    return new StorageServiceUnavailableException(
      'File service circuit breaker is open',
      { operation, resetInMs }
    );
  }

  protected handleError(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): FileServiceAdapterException | StorageServiceUnavailableException {
    if (isAxiosError(error) && error.response) {
      const status = error.response.status;
      if (status === 503) {
        return new StorageServiceUnavailableException(
          'File service unavailable',
          { ...context, operation }
        );
      }
      return FileServiceAdapterException.fromHttpError(
        operation,
        status,
        error.response.data,
        context
      );
    }

    const cause = error instanceof Error ? error : new Error(String(error));
    return FileServiceAdapterException.fromTransportError(
      operation,
      cause,
      context
    );
  }
}
