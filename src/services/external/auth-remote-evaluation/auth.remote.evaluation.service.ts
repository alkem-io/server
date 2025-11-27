import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  firstValueFrom,
  map,
  tap,
  timeout,
  catchError,
  throwError,
} from 'rxjs';
import CircuitBreaker from 'opossum';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { measureLatency } from '@services/util';
import { CircuitOpenResponse } from '@services/util/circuit-breakers/types';
import { LogContext } from '@common/enums';
import { AlkemioConfig } from '@src/types';
import { AUTH_REMOTE_EVALUATION_CLIENT } from './injection.token';
import { AuthEvaluationRequest, AuthEvaluationResponse } from './types';

/**
 * Service for evaluating authorization requests via a remote NATS microservice.
 *
 * Implements the Circuit Breaker pattern to provide resilience against
 * downstream service failures. The circuit breaker has three states:
 *
 * - **Closed**: Normal operation. Requests flow through to the remote service.
 *   Failures are counted toward the threshold.
 *
 * - **Open**: Circuit has tripped due to consecutive failures exceeding the
 *   threshold. All requests are immediately rejected with a fallback response,
 *   preventing cascade failures and allowing the downstream service time to recover.
 *
 * - **Half-Open**: After the reset timeout, the circuit allows a probe request
 *   through. If successful, the circuit closes; if it fails, the circuit reopens.
 */
@Injectable()
export class AuthRemoteEvaluationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly circuitBreaker: CircuitBreaker<
    [AuthEvaluationRequest],
    AuthEvaluationResponse | CircuitOpenResponse
  >;

  /** Tracks if circuit is in half-open state (opossum doesn't expose this cleanly) */
  private isHalfOpen = false;

  /** Timestamp of last reject log to implement rate-limited logging */
  private lastRejectLogTime = 0;

  /** Minimum interval between reject log messages (equals reset_timeout) */
  private readonly REJECT_LOG_INTERVAL: number;

  private readonly QUEUE_NAME: string;
  private readonly cbConfig: AlkemioConfig['microservices']['auth_evaluation']['circuit_breaker'];
  private readonly retryConfig: AlkemioConfig['microservices']['auth_evaluation']['retry'];

  constructor(
    @Inject(AUTH_REMOTE_EVALUATION_CLIENT) private client: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    const { circuit_breaker, retry, queue_name } = this.configService.get(
      'microservices.auth_evaluation',
      {
        infer: true,
      }
    );
    this.cbConfig = circuit_breaker;
    this.REJECT_LOG_INTERVAL = circuit_breaker.reset_timeout;
    this.retryConfig = retry;
    this.QUEUE_NAME = queue_name;

    this.circuitBreaker = this.createCircuitBreaker();
  }

  public async onModuleInit() {
    await this.client.connect();
  }

  public onModuleDestroy() {
    this.client.close();
  }

  /**
   * Evaluates an authorization request through the circuit breaker with retries.
   *
   * The circuit breaker wraps individual NATS requests so each failed attempt
   * counts toward the failure threshold. Retries are handled outside the circuit
   * breaker to ensure proper failure counting.
   *
   * When the circuit is closed, the request is forwarded to the remote
   * auth evaluation service via NATS. When open, returns a denial response
   * immediately without contacting the remote service.
   *
   * @param request - The authorization evaluation request containing
   *   agentId, authorizationPolicyId, and privilege to check
   * @returns The evaluation result, or a CircuitOpenResponse if the
   *   circuit breaker is open
   */
  async evaluate(
    request: AuthEvaluationRequest
  ): Promise<AuthEvaluationResponse | CircuitOpenResponse> {
    // Bypass circuit breaker entirely when disabled
    if (!this.cbConfig.enabled) {
      return this.executeNatsRequest(request);
    }

    // Log circuit state for debugging using opossum's status property
    const status = this.circuitBreaker.status;
    const stats = status?.stats;

    this.logger.verbose?.(
      {
        message: 'Evaluating auth request',
        circuitState: this.getCircuitState(),
        privilege: request.privilege,
        stats: stats
          ? {
              failures: stats.failures,
              successes: stats.successes,
              rejects: stats.rejects,
              fires: stats.fires,
            }
          : undefined,
      },
      LogContext.AUTH_EVALUATION
    );

    // Retry logic wraps the circuit breaker so each attempt counts as a separate
    // "fire" and failures are properly tracked toward the threshold
    try {
      return await this.evaluateWithRetry(request);
    } catch (error) {
      // All retries exhausted - return a structured fail-closed response
      const err = error as Error;
      this.logger.warn(
        {
          message: 'Auth evaluation failed after all retries - denying access',
          error: err.message,
          circuitState: this.getCircuitState(),
        },
        LogContext.AUTH_EVALUATION
      );

      return this.createServiceUnavailableResponse(err);
    }
  }

  /**
   * Creates a structured response when the auth service is unavailable.
   * Returns fail-closed (allowed: false) to maintain security invariants.
   */
  private createServiceUnavailableResponse(
    error: Error
  ): AuthEvaluationResponse & CircuitOpenResponse {
    const stats = this.circuitBreaker.status?.stats;
    const isNoSubscribers = this.isNoSubscribersError(error);

    return {
      allowed: false,
      reason: isNoSubscribers
        ? 'Authorization evaluation service is not running'
        : 'Authorization evaluation service is temporarily unavailable',
      metadata: {
        circuitState: this.getCircuitState(),
        failureCount: stats?.failures ?? 0,
        errorType: isNoSubscribers ? 'no-subscribers' : 'service-error',
      },
      retryAfter: this.cbConfig.reset_timeout,
    };
  }

  /**
   * Gets the current circuit breaker state as a string.
   * Uses opossum's status to determine the actual state.
   */
  private getCircuitState(): 'open' | 'half-open' | 'closed' {
    // In opossum:
    // - opened = true means circuit is OPEN (rejecting requests)
    // - opened = false could mean CLOSED or HALF-OPEN
    // - When in half-open, opened is false but it allows exactly one probe
    //
    // Unfortunately opossum doesn't expose a clean halfOpen property,
    // so we track it via our event handler
    if (this.circuitBreaker.opened) {
      return 'open';
    }
    // Check if we're in half-open state by looking at the pending count
    // In half-open, there should be exactly one pending request allowed
    if (this.isHalfOpen) {
      return 'half-open';
    }
    return 'closed';
  }

  /**
   * Creates and configures the circuit breaker instance.
   *
   * The circuit breaker wraps individual NATS requests (not the retry loop)
   * so that each failed attempt counts toward the failure threshold. This
   * ensures accurate failure tracking for circuit state transitions.
   *
   * Configuration is loaded from alkemio.yml via ConfigService.
   *
   * @returns Configured CircuitBreaker instance
   */
  private createCircuitBreaker(): CircuitBreaker<
    [AuthEvaluationRequest],
    AuthEvaluationResponse | CircuitOpenResponse
  > {
    if (!this.cbConfig.enabled) {
      // When disabled, create a pass-through breaker that always forwards requests
      // directly to the NATS service without any circuit protection
      return new CircuitBreaker(
        (request: AuthEvaluationRequest) => this.executeNatsRequest(request),
        {
          enabled: false,
        }
      );
    }

    // Create circuit breaker wrapping individual NATS requests:
    // - Each request attempt (including retries) counts as a separate "fire"
    // - Each failure counts toward the failure threshold
    // - timeout: disabled here; we use RxJS timeout in executeNatsRequest
    // - errorThresholdPercentage: percentage of failures to trip the circuit
    // - volumeThreshold: minimum requests in window before circuit can trip
    // - resetTimeout: ms to wait before transitioning from open to half-open
    // - rollingCountTimeout: window for counting failures
    // - rollingCountBuckets: number of buckets in the rolling window
    const circuitBreaker = new CircuitBreaker(
      (request: AuthEvaluationRequest) => this.executeNatsRequest(request),
      {
        timeout: false,
        errorThresholdPercentage: this.cbConfig.error_threshold_percentage,
        volumeThreshold: this.cbConfig.failure_threshold,
        resetTimeout: this.cbConfig.reset_timeout,
        rollingCountTimeout: this.cbConfig.rolling_count_timeout,
        rollingCountBuckets: this.cbConfig.rolling_count_buckets,
      }
    );

    this.logger.log(
      {
        message: 'Circuit breaker initialized',
        config: {
          errorThresholdPercentage: this.cbConfig.error_threshold_percentage,
          volumeThreshold: this.cbConfig.failure_threshold,
          resetTimeout: this.cbConfig.reset_timeout,
          timeout: this.cbConfig.timeout,
          rollingCountTimeout: this.cbConfig.rolling_count_timeout,
          rollingCountBuckets: this.cbConfig.rolling_count_buckets,
        },
      },
      LogContext.AUTH_EVALUATION
    );

    // Fallback function executes when circuit is open (rejecting requests).
    // When circuit is closed/half-open and the wrapped function throws,
    // we let the error propagate so retry logic can handle it.
    // We only return a fail-closed response when actively rejecting.
    circuitBreaker.fallback(
      (
        _request: AuthEvaluationRequest,
        error?: Error
      ): AuthEvaluationResponse & CircuitOpenResponse => {
        const retryAfter = this.cbConfig.reset_timeout;
        const isOpen = circuitBreaker.opened;
        const stats = circuitBreaker.status?.stats;

        // If circuit is NOT open, this fallback was triggered by an error
        // from the wrapped function. Re-throw so retry logic can handle it.
        if (!isOpen && error) {
          this.logger.verbose?.(
            {
              message:
                'Fallback triggered by error (circuit closed) - re-throwing for retry',
              error: error.message,
              stats: stats
                ? { failures: stats.failures, fires: stats.fires }
                : undefined,
            },
            LogContext.AUTH_EVALUATION
          );
          throw error;
        }

        this.logger.verbose?.(
          {
            message: 'Circuit breaker fallback triggered - returning denial',
            circuitOpen: isOpen,
            reason: isOpen ? 'circuit-open' : 'half-open-probe-failed',
            retryAfter,
            stats: stats
              ? { failures: stats.failures, fires: stats.fires }
              : undefined,
          },
          LogContext.AUTH_EVALUATION
        );

        return {
          allowed: false, // Fail-closed: deny access when service unavailable
          reason: 'Authorization evaluation service is temporarily unavailable',
          metadata: {
            circuitState: 'open',
            failureCount: stats?.failures ?? 0,
          },
          retryAfter, // Hints to clients when to retry
        };
      }
    );

    this.attachEventHandlers(circuitBreaker);

    return circuitBreaker;
  }

  /**
   * Attaches event handlers for circuit breaker state transitions.
   *
   * Opossum emits events during the circuit breaker lifecycle that we use for:
   * - Observability: logging state transitions for monitoring and debugging
   * - State management: resetting internal counters when circuit recovers
   * - Rate limiting: preventing log flooding during sustained outages
   *
   * Event flow during a failure scenario:
   * 1. Requests fail → 'failure' events fire
   * 2. Threshold reached → 'open' event fires
   * 3. Reset timeout expires → 'halfOpen' event fires
   * 4. Probe request succeeds → 'close' event fires (or fails → back to 'open')
   *
   * @param circuitBreaker - The circuit breaker instance to attach handlers to
   */
  private attachEventHandlers(
    circuitBreaker: CircuitBreaker<
      [AuthEvaluationRequest],
      AuthEvaluationResponse | CircuitOpenResponse
    >
  ): void {
    // 'failure' event: A request failed (error was thrown from wrapped function)
    circuitBreaker.on('failure', (error: Error) => {
      this.logger.verbose?.(
        {
          message: 'Circuit breaker recorded failure',
          error: error.message,
          stats: circuitBreaker.status?.stats,
        },
        LogContext.AUTH_EVALUATION
      );
    });

    // 'open' event: Circuit has tripped due to too many failures.
    // This is a significant event indicating the downstream service is unhealthy.
    // Log at warn level to ensure visibility in monitoring systems.
    circuitBreaker.on('open', () => {
      this.isHalfOpen = false;
      const stats = circuitBreaker.status?.stats;
      this.logger.warn(
        {
          message: 'Circuit breaker OPENED - requests will be rejected',
          resetTimeout: this.cbConfig.reset_timeout,
          stats: stats
            ? { failures: stats.failures, fires: stats.fires }
            : undefined,
        },
        LogContext.AUTH_EVALUATION
      );
    });

    // 'halfOpen' event: Reset timeout has elapsed, circuit is testing recovery.
    // The next request will be a "probe" - if it succeeds, circuit closes;
    // if it fails, circuit reopens immediately.
    circuitBreaker.on('halfOpen', () => {
      this.isHalfOpen = true;
      const stats = circuitBreaker.status?.stats;
      this.logger.warn(
        {
          message:
            'Circuit breaker HALF-OPEN - allowing probe request to test recovery',
          stats: stats
            ? { failures: stats.failures, fires: stats.fires }
            : undefined,
        },
        LogContext.AUTH_EVALUATION
      );
    });

    // 'close' event: Probe request succeeded, service has recovered.
    // opossum automatically resets stats when circuit closes.
    circuitBreaker.on('close', () => {
      this.isHalfOpen = false;
      this.logger.warn(
        {
          message: 'Circuit breaker CLOSED - service recovered',
        },
        LogContext.AUTH_EVALUATION
      );
    });

    // 'timeout' event: A request exceeded opossum's internal timeout.
    // Note: We disabled opossum timeout and use RxJS, so this may not fire.
    circuitBreaker.on('timeout', () => {
      this.logger.verbose?.(
        'Opossum timeout event fired',
        LogContext.AUTH_EVALUATION
      );
    });

    // 'reject' event: Request was rejected because circuit is open.
    // This fires for every blocked request while circuit is open.
    // We rate-limit logging to prevent flooding.
    circuitBreaker.on('reject', () => {
      const now = Date.now();
      if (now - this.lastRejectLogTime > this.REJECT_LOG_INTERVAL) {
        const stats = circuitBreaker.status?.stats;
        this.logger.warn(
          {
            message: 'Circuit breaker REJECTING requests (circuit is open)',
            retryAfterMs: this.cbConfig.reset_timeout,
            stats: stats
              ? { failures: stats.failures, fires: stats.fires }
              : undefined,
          },
          LogContext.AUTH_EVALUATION
        );
        this.lastRejectLogTime = now;
      }
    });
  }

  /**
   * Calculates the approximate time until the circuit breaker will
   * transition from open to half-open state.
   *
   * Executes an authorization request with retry logic for transient failures.
   *
   * Each retry attempt goes through the circuit breaker, ensuring that every
   * failed attempt is counted toward the failure threshold. This provides
   * accurate failure tracking for circuit state transitions.
   *
   * Implements exponential backoff between retry attempts. Certain errors
   * (like "no subscribers listening") are not retried as they indicate
   * the service is not running rather than a transient issue.
   *
   * @param request - The authorization evaluation request
   * @returns The successful evaluation response, or CircuitOpenResponse if circuit is open
   * @throws The last error encountered if all retries are exhausted
   */
  private async evaluateWithRetry(
    request: AuthEvaluationRequest
  ): Promise<AuthEvaluationResponse | CircuitOpenResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.max_attempts; attempt++) {
      // Check if circuit is open BEFORE firing - if open, return immediately
      // This prevents unnecessary retry attempts when circuit has tripped
      if (this.circuitBreaker.opened) {
        this.logger.verbose?.(
          {
            message: 'Circuit is open - skipping retry attempt',
            attempt,
            maxAttempts: this.retryConfig.max_attempts,
          },
          LogContext.AUTH_EVALUATION
        );
        // Return fallback response directly
        return this.createCircuitOpenResponse();
      }

      try {
        // Each attempt goes through the circuit breaker, so failures are counted
        const result = await this.circuitBreaker.fire(request);

        // Check if fallback was triggered (circuit opened during the call)
        if (this.isCircuitOpenResponse(result)) {
          // Circuit opened - don't retry, return immediately
          return result;
        }

        // Success - return the result
        return result;
      } catch (error) {
        lastError = error as Error;

        this.logger.verbose?.(
          {
            message: 'Auth evaluation attempt failed',
            attempt,
            maxAttempts: this.retryConfig.max_attempts,
            error: lastError.message,
          },
          LogContext.AUTH_EVALUATION
        );

        // FR-016: Don't retry on "no subscribers listening" - service not running
        if (this.isNoSubscribersError(lastError)) {
          throw lastError;
        }

        // Check if we should retry
        if (
          attempt < this.retryConfig.max_attempts &&
          this.isRetryableError(lastError)
        ) {
          const delay = this.calculateBackoff(attempt, this.retryConfig);
          this.logger.verbose?.(
            {
              message: 'Retrying auth evaluation request',
              attempt,
              maxAttempts: this.retryConfig.max_attempts,
              delay,
              error: lastError.message,
            },
            LogContext.AUTH_EVALUATION
          );
          await this.delay(delay);
        } else {
          // Not retryable or max attempts reached
          this.logger.warn(
            {
              message: 'Auth evaluation failed - no more retries',
              attempt,
              maxAttempts: this.retryConfig.max_attempts,
              error: lastError.message,
              isRetryable: this.isRetryableError(lastError),
            },
            LogContext.AUTH_EVALUATION
          );
          break;
        }
      }
    }

    throw lastError ?? new Error('Auth evaluation failed after retries');
  }

  /**
   * Type guard to check if a response indicates the circuit is open.
   */
  private isCircuitOpenResponse(
    response: AuthEvaluationResponse | CircuitOpenResponse
  ): response is CircuitOpenResponse {
    return 'retryAfter' in response && 'metadata' in response;
  }

  /**
   * Creates a circuit open response for when the circuit breaker is open.
   * Used to provide a consistent response when requests are rejected.
   */
  private createCircuitOpenResponse(): AuthEvaluationResponse &
    CircuitOpenResponse {
    const stats = this.circuitBreaker.status?.stats;
    return {
      allowed: false,
      reason: 'Authorization evaluation service is temporarily unavailable',
      metadata: {
        circuitState: 'open',
        failureCount: stats?.failures ?? 0,
      },
      retryAfter: this.cbConfig.reset_timeout,
    };
  }

  /**
   * Calculates exponential backoff delay for retry attempts.
   *
   * Formula: base_delay * (multiplier ^ (attempt - 1))
   * Example with defaults (500ms base, 2x multiplier):
   *   Attempt 1: 500ms, Attempt 2: 1000ms, Attempt 3: 2000ms, etc.
   *
   * @param attempt - Current attempt number (1-based)
   * @param retryConfig - Retry configuration with base_delay and multiplier
   * @returns Delay in milliseconds, capped at 8 seconds
   */
  private calculateBackoff(
    attempt: number,
    retryConfig: { base_delay: number; backoff_multiplier: number }
  ): number {
    const delay =
      retryConfig.base_delay *
      Math.pow(retryConfig.backoff_multiplier, attempt - 1);
    // Cap at 8 seconds to prevent excessive wait times
    return Math.min(delay, 8000);
  }

  /** Promise-based delay utility for retry backoff */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determines if an error is transient and worth retrying.
   *
   * Retryable errors include:
   * - Timeouts (might be transient network delay)
   * - Connection/network errors (temporary connectivity issues)
   *
   * Non-retryable errors (fail fast):
   * - "no subscribers listening" (service not running)
   * - Unknown errors (could indicate logic bugs)
   *
   * @param error - The error to evaluate
   * @returns true if the request should be retried
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message?.toLowerCase() ?? '';
    // Retry on timeouts and transient connection/network errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }
    return message.includes('connection') || message.includes('network');
  }

  /**
   * Checks if the error indicates no NATS subscribers are listening.
   *
   * This specific error means the auth evaluation microservice is not
   * running or not connected to NATS. Retrying won't help until the
   * service is restored, so we fail fast to open the circuit quickly.
   *
   * @param error - The error to check
   * @returns true if this is a "no subscribers" error
   */
  private isNoSubscribersError(error: Error): boolean {
    return error.message?.includes('no subscribers listening') ?? false;
  }

  /**
   * Executes the actual NATS request to the auth evaluation microservice.
   *
   * Sends a request on the 'auth.evaluate' topic and waits for a response.
   * Includes timeout handling and latency measurement for observability.
   *
   * @param request - The authorization evaluation request
   * @returns Promise resolving to the evaluation response
   * @throws TimeoutError if request exceeds configured timeout
   * @throws Error with "no subscribers listening" if service unavailable
   */
  private executeNatsRequest(
    request: AuthEvaluationRequest
  ): Promise<AuthEvaluationResponse> {
    const timeoutMs = this.cbConfig.timeout;

    const result$ = this.client
      .send<AuthEvaluationResponse, AuthEvaluationRequest>(this.QUEUE_NAME, {
        agentId: request.agentId,
        authorizationPolicyId: request.authorizationPolicyId,
        privilege: request.privilege,
      })
      .pipe(
        // Apply timeout before the response is received
        timeout(timeoutMs),
        // Measure round-trip latency for observability
        measureLatency(),
        tap(({ latency }) =>
          this.logger.verbose?.(
            `Auth evaluation round trip took ${latency}ms`,
            LogContext.AUTH_EVALUATION
          )
        ),
        // Extract the response value from the latency wrapper
        map(({ value }) => value),
        // Log specific error conditions for debugging
        catchError(err => {
          if (err.message?.includes('no subscribers listening')) {
            this.logger.warn(
              'Auth evaluation service unavailable: no subscribers listening',
              LogContext.AUTH_EVALUATION
            );
          }
          return throwError(() => err);
        })
      );

    return firstValueFrom(result$);
  }
}
