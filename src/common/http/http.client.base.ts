import { HttpService } from '@nestjs/axios';
import { LoggerService } from '@nestjs/common';
import { AxiosResponse, isAxiosError } from 'axios';
import {
  catchError,
  firstValueFrom,
  map,
  Observable,
  retry,
  timeout,
  timer,
} from 'rxjs';
import { CircuitBreaker, type CircuitBreakerConfig } from './circuit.breaker';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface HttpClientBaseConfig {
  /** Base URL prepended to the path passed to `sendRequest`. No trailing slash. */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  timeout: number;
  /** Number of retries on transport/5xx errors (4xx errors are not retried). */
  retries: number;
  /** Circuit breaker configuration. */
  circuitBreaker: CircuitBreakerConfig;
  /** Log context (Winston `LogContext` enum value). */
  logContext: string;
  /** Log prefix (e.g. `[FileService]`) for all lines emitted by this client. */
  logPrefix: string;
}

/**
 * Reusable HTTP client base for outbound adapters.
 *
 * Provides:
 *  - Generic typed `sendRequest<T>()` for JSON responses
 *  - `sendBinaryRequest()` for raw binary downloads (returns `Buffer`)
 *  - Per-request timeout
 *  - Retry with linear backoff (500ms × retry count) for transport / 5xx failures
 *  - Pluggable circuit breaker (via `CircuitBreaker`)
 *  - Uniform verbose/warn logging
 *
 * Both transport methods share the same pipeline via `runPipeline(...)`;
 * subclasses implement error translation via `handleError()` /
 * `openCircuitException()`.
 */
export abstract class HttpClientBase {
  protected readonly baseUrl: string;
  protected readonly requestTimeout: number;
  protected readonly retries: number;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly logContext: string;
  protected readonly logPrefix: string;

  protected constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: LoggerService,
    config: HttpClientBaseConfig
  ) {
    this.baseUrl = config.baseUrl;
    this.requestTimeout = config.timeout;
    this.retries = config.retries;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.logContext = config.logContext;
    this.logPrefix = config.logPrefix;
  }

  /**
   * Convert a raw error (Axios / transport / 5xx) into the subclass's
   * domain-specific exception. Always called with the circuit-breaker
   * already updated.
   */
  protected abstract handleError(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): Error;

  /**
   * Return the exception to throw when the circuit is open and a request
   * is refused without reaching the network.
   */
  protected abstract openCircuitException(
    operation: string,
    resetInMs: number
  ): Error;

  /** Throws `openCircuitException(...)` if the circuit is currently open. */
  protected checkCircuit(operation: string): void {
    const status = this.circuitBreaker.check();
    if (status.open) {
      throw this.openCircuitException(operation, status.resetInMs);
    }
  }

  /**
   * Issue a JSON HTTP request through the shared pipeline. Returns the parsed
   * response body (typed as `TResult`).
   *
   * NOTE: Circuit-breaker enforcement is opt-in — callers must invoke
   * `checkCircuit(operation)` explicitly before this method to short-circuit
   * requests while the breaker is OPEN. The pipeline still updates breaker
   * state (`onSuccess` / `onFailure`) on every request.
   */
  protected sendRequest<TResult>(
    operation: string,
    method: HttpMethod,
    path: string,
    data?: unknown,
    headers?: Record<string, string>,
    context?: Record<string, unknown>
  ): Promise<TResult> {
    const url = `${this.baseUrl}${path}`;
    this.logRequestStart(operation, method, path);
    const request$ = this.httpService.request<TResult>({
      method,
      url,
      data,
      headers,
    });
    return this.runPipeline(
      operation,
      request$,
      response => response.data as TResult,
      context
    );
  }

  /**
   * Issue a binary HTTP request through the same pipeline as `sendRequest`
   * and return the response body as a `Buffer`. Uses `responseType:
   * 'arraybuffer'` under the hood.
   *
   * Same opt-in `checkCircuit` semantics as `sendRequest`.
   */
  protected sendBinaryRequest(
    operation: string,
    method: HttpMethod,
    path: string,
    context?: Record<string, unknown>
  ): Promise<Buffer> {
    const url = `${this.baseUrl}${path}`;
    this.logRequestStart(operation, method, path);
    const request$ = this.httpService.request<ArrayBuffer>({
      method,
      url,
      responseType: 'arraybuffer',
    });
    return this.runPipeline(
      operation,
      request$,
      response => Buffer.from(response.data),
      context
    );
  }

  private logRequestStart(
    operation: string,
    method: HttpMethod,
    path: string
  ): void {
    this.logger.verbose?.(
      `${this.logPrefix} ${operation}: ${method.toUpperCase()} ${path}`,
      this.logContext
    );
  }

  private runPipeline<TRaw, TResult>(
    operation: string,
    request$: Observable<AxiosResponse<TRaw>>,
    transform: (response: AxiosResponse<TRaw>) => TResult,
    context?: Record<string, unknown>
  ): Promise<TResult> {
    const piped$ = request$.pipe(
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
            `${this.logPrefix} Retrying ${operation} [${retryCount}/${this.retries}]`,
            this.logContext
          );
          return timer(500 * retryCount);
        },
      }),
      map(response => {
        this.circuitBreaker.onSuccess();
        this.logger.verbose?.(
          `${this.logPrefix} ${operation}: success`,
          this.logContext
        );
        return transform(response);
      }),
      catchError(error => {
        const result = this.circuitBreaker.onFailure();
        if (result.opened) {
          this.logger.warn?.(
            `${this.logPrefix} circuit breaker opened after ${result.failureCount} failures`,
            this.logContext
          );
        }
        throw this.handleError(operation, error, context);
      })
    );

    return firstValueFrom(piped$);
  }
}
