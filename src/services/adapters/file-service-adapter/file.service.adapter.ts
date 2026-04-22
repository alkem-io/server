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
import type {
  CreateDocumentMetadata,
  CreateDocumentResult,
  DeleteDocumentResult,
  UpdateDocumentInput,
  UpdateDocumentResult,
} from './dto';
import {
  FileServiceAdapterException,
  StorageServiceUnavailableException,
} from './file.service.adapter.exception';

const LOG_PREFIX = '[FileService]';
const FILE_PATH_PREFIX = '/internal/file';

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

    return this.sendRequest<CreateDocumentResult>(
      'createDocument',
      'post',
      FILE_PATH_PREFIX,
      form,
      form.getHeaders()
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
   * Only `storageBucketId` and `temporaryLocation` are supported server-side.
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

  private filePath(documentId: string): string {
    return `${FILE_PATH_PREFIX}/${documentId}`;
  }

  private fileContentPath(documentId: string): string {
    return `${this.filePath(documentId)}/content`;
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
