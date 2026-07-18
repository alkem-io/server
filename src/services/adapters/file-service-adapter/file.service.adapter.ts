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
import type {
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

/**
 * SHORT timeout for the best-effort outbound image-dimensions fetch
 * (`getDocumentMeta`). Deliberately far below the adapter's full request
 * timeout: image dims are a cosmetic rendering hint on the hot send path, so a
 * degraded file-service `/meta` must add at most this much latency per image —
 * never the full timeout × retries — and must never block the send.
 */
const DOCUMENT_META_TIMEOUT_MS = 2500;

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
    if (metadata.externalReference) {
      form.append('externalReference', metadata.externalReference);
    }
    if (metadata.skipImageProcessing) {
      form.append('skipImageProcessing', 'true');
    }

    return this.sendRequest<CreateDocumentResult>(
      'createDocument',
      'post',
      FILE_PATH_PREFIX,
      form,
      form.getHeaders()
    );
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
    this.checkEnabledAndCircuit('moveDocument');

    return this.sendRequest<UpdateDocumentResult>(
      'moveDocument',
      'patch',
      this.filePath(documentId),
      patch
    );
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
      return await this.sendRequest<DocumentReferenceResult>(
        'getDocumentByReference',
        'get',
        path,
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

  /**
   * Fetch a document's metadata by id (feature 013):
   * `GET /internal/file/{documentId}/meta` — the by-id meta route
   * `documentMetaResponse` backs. The OUTBOUND send path uses this to source
   * intrinsic image dimensions (`imageWidth` / `imageHeight`): those are
   * transient, file-service-owned fields (cached `content_metadata`), absent
   * from the server's Document entity after a DB load, so the outbound
   * attachment ref can only carry them by asking file-service. The `/meta`
   * response is the SAME `documentMetaResponse` shape returned by-reference, so
   * it deserializes as a `DocumentReferenceResult` (dims are all the caller
   * reads).
   *
   * BEST-EFFORT + FULLY ISOLATED (deliberately unlike every other method here):
   * image dims are a cosmetic rendering hint, so this fetch MUST NOT be able to
   * (a) block the hot send path for long, or (b) pollute the SHARED circuit
   * breaker that guards uploads/pins — a degraded `/meta` must never fast-fail
   * unrelated healthy file-service traffic. It therefore does NOT route through
   * `sendRequest` / `checkEnabledAndCircuit`: it issues a DIRECT axios GET with a
   * SHORT timeout (`DOCUMENT_META_TIMEOUT_MS`), ZERO retries, and no breaker
   * accounting, and resolves EVERY failure (timeout / 4xx / 5xx / network / 404)
   * to `null` — NEVER propagating. A benign 404 (no meta / not found) is expected
   * and stays quiet; every other failure (timeout / 5xx / network / other) is
   * logged at WARN so the dropped dimensions stay observable. The `enabled` gate
   * is kept (returns `null`, does not throw). The caller also guards the result,
   * as defence-in-depth.
   */
  async getDocumentMeta(
    documentId: string
  ): Promise<DocumentReferenceResult | null> {
    if (!this.enabled) {
      return null;
    }

    const url = `${this.baseUrl}${this.fileMetaPath(documentId)}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<DocumentReferenceResult>(url, {
          timeout: DOCUMENT_META_TIMEOUT_MS,
        })
      );
      return response.data;
    } catch (error) {
      // Best-effort: EVERY failure resolves to `null` — dims are a rendering
      // hint, so the send proceeds without them and the shared breaker is
      // untouched. A genuine 404 (the document has no meta / not found) is
      // expected on this path and stays QUIET to avoid log spam; every other
      // failure (timeout / 5xx / network / other) is logged at WARN so dropped
      // dimensions are observable. Failures are logged but NEVER propagate.
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.warn?.(
        {
          message: `${this.logPrefix} Best-effort document meta lookup failed; attachment dimensions omitted`,
          documentId,
          error: error instanceof Error ? error.message : String(error),
        },
        this.logContext
      );
      return null;
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
