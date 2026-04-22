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
import { catchError, firstValueFrom, map, timeout } from 'rxjs';
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
    this.checkEnabled();
    this.checkCircuit('createDocument');

    const form = new FormData();
    form.append('file', file, {
      filename: metadata.displayName,
      contentType: 'application/octet-stream',
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
      '/internal/file',
      form,
      form.getHeaders()
    );
  }

  /**
   * Stream file content from the Go file-service-go.
   * Uses `arraybuffer` response type so we return a `Buffer` directly.
   * Separate from `sendRequest` because the generic pipeline assumes JSON
   * response parsing; binary downloads need their own transport path.
   */
  async getDocumentContent(documentId: string): Promise<Buffer> {
    this.checkEnabled();
    this.checkCircuit('getDocumentContent');

    const url = `${this.baseUrl}/internal/file/${documentId}/content`;

    this.logger.verbose?.(
      `${LOG_PREFIX} getDocumentContent: ${documentId}`,
      LogContext.STORAGE_BUCKET
    );

    const request$ = this.httpService
      .get(url, { responseType: 'arraybuffer' })
      .pipe(
        timeout({ first: this.requestTimeout }),
        map(response => {
          this.circuitBreaker.onSuccess();
          return Buffer.from(response.data);
        }),
        catchError(error => {
          const result = this.circuitBreaker.onFailure();
          if (result.opened) {
            this.logger.warn?.(
              `${LOG_PREFIX} circuit breaker opened after ${result.failureCount} failures`,
              LogContext.STORAGE_BUCKET
            );
          }
          throw this.handleError('getDocumentContent', error, { documentId });
        })
      );

    return firstValueFrom(request$);
  }

  /**
   * Update mutable document metadata in the Go file-service-go.
   * Only `storageBucketId` and `temporaryLocation` are supported server-side.
   */
  async updateDocument(
    documentId: string,
    patch: UpdateDocumentInput
  ): Promise<UpdateDocumentResult> {
    this.checkEnabled();
    this.checkCircuit('updateDocument');

    return this.sendRequest<UpdateDocumentResult>(
      'updateDocument',
      'patch',
      `/internal/file/${documentId}`,
      patch
    );
  }

  /**
   * Delete a document from the Go file-service-go.
   * Returns `authorizationId` and `tagsetId` so the server can clean up the
   * corresponding auth policy and tagset rows (both server-owned).
   */
  async deleteDocument(documentId: string): Promise<DeleteDocumentResult> {
    this.checkEnabled();
    this.checkCircuit('deleteDocument');

    return this.sendRequest<DeleteDocumentResult>(
      'deleteDocument',
      'delete',
      `/internal/file/${documentId}`
    );
  }

  private checkEnabled(): void {
    if (!this.enabled) {
      throw new StorageServiceUnavailableException(
        'File service adapter is disabled'
      );
    }
  }

  protected openCircuitException(operation: string, resetInMs: number): Error {
    return new StorageServiceUnavailableException(
      `File service circuit breaker is open (${operation})`,
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
          `File service unavailable during ${operation}`,
          context
        );
      }
      return FileServiceAdapterException.fromHttpError(
        operation,
        status,
        error.response.data,
        context
      );
    }

    if (error instanceof Error) {
      return FileServiceAdapterException.fromTransportError(
        operation,
        error,
        context
      );
    }

    return FileServiceAdapterException.fromTransportError(
      operation,
      new Error(String(error)),
      context
    );
  }
}
