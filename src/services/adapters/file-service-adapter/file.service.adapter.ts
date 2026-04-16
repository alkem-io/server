import { LogContext } from '@common/enums';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types/alkemio.config';
import { isAxiosError } from 'axios';
import FormData from 'form-data';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { catchError, firstValueFrom, map, retry, timeout, timer } from 'rxjs';
import {
  FileServiceAdapterException,
  StorageServiceUnavailableException,
} from './file.service.adapter.exception';

export interface CreateDocumentMetadata {
  displayName: string;
  mimeType?: string;
  storageBucketId: string;
  authorizationId: string;
  tagsetId?: string;
  createdBy?: string;
  temporaryLocation?: boolean;
  allowedMimeTypes?: string;
  maxFileSize?: number;
}

export interface CreateDocumentResult {
  id: string;
  externalID: string;
  mimeType: string;
  size: number;
}

export interface DeleteDocumentResult {
  authorizationId: string;
  tagsetId: string | null;
}

export interface UpdateDocumentInput {
  storageBucketId?: string;
  temporaryLocation?: boolean;
}

export interface UpdateDocumentResult {
  id: string;
  storageBucketId: string;
  temporaryLocation: boolean;
}

@Injectable()
export class FileServiceAdapter {
  private readonly baseUrl: string;
  private readonly requestTimeout: number;
  private readonly retries: number;
  private readonly enabled: boolean;

  // Simple circuit breaker state
  private failureCount = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private readonly failureThreshold = 5;
  private readonly circuitResetTimeMs = 30000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.baseUrl = this.configService.get('storage.file_service.url', {
      infer: true,
    });
    this.requestTimeout = this.configService.get(
      'storage.file_service.timeout',
      { infer: true }
    );
    this.retries = this.configService.get('storage.file_service.retries', {
      infer: true,
    });
    this.enabled = this.configService.get('storage.file_service.enabled', {
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
      '/internal/document',
      form,
      form.getHeaders()
    );
  }

  /**
   * Get document file content from the Go file-service-go.
   */
  async getDocumentContent(documentId: string): Promise<Buffer> {
    this.checkEnabled();
    this.checkCircuit('getDocumentContent');

    const url = `${this.baseUrl}/internal/document/${documentId}/content`;

    this.logger.verbose?.(
      `[FileService] getDocumentContent: ${documentId}`,
      LogContext.STORAGE_BUCKET
    );

    const request$ = this.httpService
      .get(url, { responseType: 'arraybuffer' })
      .pipe(
        timeout({ first: this.requestTimeout }),
        map(response => {
          this.onSuccess();
          return Buffer.from(response.data);
        }),
        catchError(error => {
          this.onFailure();
          throw this.handleError('getDocumentContent', error, { documentId });
        })
      );

    return firstValueFrom(request$);
  }

  /**
   * Update document metadata in the Go file-service-go (PATCH).
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
      `/internal/document/${documentId}`,
      patch
    );
  }

  /**
   * Delete a document from the Go file-service-go.
   * Returns authorizationId and tagsetId for server-side cleanup.
   */
  async deleteDocument(documentId: string): Promise<DeleteDocumentResult> {
    this.checkEnabled();
    this.checkCircuit('deleteDocument');

    return this.sendRequest<DeleteDocumentResult>(
      'deleteDocument',
      'delete',
      `/internal/document/${documentId}`
    );
  }

  private checkEnabled(): void {
    if (!this.enabled) {
      throw new StorageServiceUnavailableException(
        'File service adapter is disabled'
      );
    }
  }

  private checkCircuit(operation: string): void {
    if (this.circuitOpen) {
      const elapsed = Date.now() - this.circuitOpenedAt;
      if (elapsed < this.circuitResetTimeMs) {
        throw new StorageServiceUnavailableException(
          `File service circuit breaker is open (${operation})`,
          { operation, resetInMs: this.circuitResetTimeMs - elapsed }
        );
      }
      // Half-open: allow one request through
      this.circuitOpen = false;
      this.failureCount = 0;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.circuitOpen = false;
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      this.logger.warn?.(
        `File service circuit breaker opened after ${this.failureCount} failures`,
        LogContext.STORAGE_BUCKET
      );
    }
  }

  private sendRequest<TResult>(
    operation: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<TResult> {
    const url = `${this.baseUrl}${path}`;

    this.logger.verbose?.(
      `[FileService] ${operation}: ${method.toUpperCase()} ${path}`,
      LogContext.STORAGE_BUCKET
    );

    const request$ = this.httpService
      .request<TResult>({
        method,
        url,
        data,
        headers,
      })
      .pipe(
        timeout({ first: this.requestTimeout }),
        retry({
          count: this.retries,
          delay: (error, retryCount) => {
            // Don't retry 4xx errors (client errors)
            if (
              isAxiosError(error) &&
              error.response?.status &&
              error.response.status >= 400 &&
              error.response.status < 500
            ) {
              throw error;
            }
            this.logger.warn?.(
              `[FileService] Retrying ${operation} [${retryCount}/${this.retries}]`,
              LogContext.STORAGE_BUCKET
            );
            return timer(500 * retryCount);
          },
        }),
        map(response => {
          this.onSuccess();
          this.logger.verbose?.(
            `[FileService] ${operation}: success`,
            LogContext.STORAGE_BUCKET
          );
          return response.data;
        }),
        catchError(error => {
          this.onFailure();
          throw this.handleError(operation, error);
        })
      );

    return firstValueFrom(request$);
  }

  private handleError(
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
