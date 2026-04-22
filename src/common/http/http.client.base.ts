import { HttpService } from '@nestjs/axios';
import { LoggerService } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { catchError, firstValueFrom, map, retry, timeout, timer } from 'rxjs';
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
 *  - Generic typed `sendRequest<T>()` over NestJS `HttpService`
 *  - Per-request timeout
 *  - Retry with exponential backoff for transport / 5xx failures
 *  - Pluggable circuit breaker (via `CircuitBreaker`)
 *  - Uniform verbose/warn logging
 *
 * Subclasses implement error translation so they can produce their own
 * domain-specific exceptions via `handleError()` / `openCircuitException()`.
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
   * Issue an HTTP request through the shared pipeline (timeout → retry →
   * success/failure hooks → error translation). Returns the parsed response
   * body (typed as `TResult`).
   */
  protected sendRequest<TResult>(
    operation: string,
    method: HttpMethod,
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<TResult> {
    const url = `${this.baseUrl}${path}`;

    this.logger.verbose?.(
      `${this.logPrefix} ${operation}: ${method.toUpperCase()} ${path}`,
      this.logContext
    );

    const request$ = this.httpService
      .request<TResult>({ method, url, data, headers })
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
          return response.data;
        }),
        catchError(error => {
          const result = this.circuitBreaker.onFailure();
          if (result.opened) {
            this.logger.warn?.(
              `${this.logPrefix} circuit breaker opened after ${result.failureCount} failures`,
              this.logContext
            );
          }
          throw this.handleError(operation, error);
        })
      );

    return firstValueFrom(request$);
  }
}
