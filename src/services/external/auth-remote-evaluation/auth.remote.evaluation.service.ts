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

  /** Tracks consecutive failures for circuit breaker threshold evaluation */
  private consecutiveFailures = 0;

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
   * Evaluates an authorization request through the circuit breaker.
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

    return this.circuitBreaker.fire(request);
  }

  /**
   * Creates and configures the circuit breaker instance.
   *
   * The circuit breaker wraps the retry-enabled evaluation function and
   * provides automatic failure detection and recovery. Configuration is
   * loaded from alkemio.yml via ConfigService.
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

    // Create circuit breaker with configured options:
    // - timeout: disabled here; we use RxJS timeout in executeNatsRequest
    // - errorThresholdPercentage: 100% means we use volumeThreshold for consecutive failures
    // - volumeThreshold: number of failures before opening the circuit
    // - resetTimeout: ms to wait before transitioning from open to half-open
    const circuitBreaker = new CircuitBreaker(
      (request: AuthEvaluationRequest) => this.evaluateWithRetry(request),
      {
        timeout: false,
        errorThresholdPercentage: 100,
        volumeThreshold: this.cbConfig.failure_threshold,
        resetTimeout: this.cbConfig.reset_timeout,
      }
    );

    // Fallback function executes when circuit is open.
    // Returns a fail-closed response (allowed: false) to maintain security
    // invariants even when the auth service is unavailable.
    circuitBreaker.fallback(
      (
        _request: AuthEvaluationRequest
      ): AuthEvaluationResponse & CircuitOpenResponse => {
        const retryAfter = this.calculateRetryAfter();
        return {
          allowed: false, // Fail-closed: deny access when service unavailable
          reason: 'Authorization evaluation service is temporarily unavailable',
          metadata: {
            circuitState: 'open',
            failureCount: this.consecutiveFailures,
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
   * 1. Requests fail → failures accumulate
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
    // 'open' event: Circuit has tripped due to too many failures.
    // This is a significant event indicating the downstream service is unhealthy.
    // Log at warn level to ensure visibility in monitoring systems.
    circuitBreaker.on('open', () => {
      this.logger.warn(
        {
          message: 'Circuit breaker opened',
          failureCount: this.consecutiveFailures,
          resetTimeout: this.cbConfig.reset_timeout,
        },
        LogContext.AUTH_EVALUATION
      );
    });

    // 'halfOpen' event: Reset timeout has elapsed, circuit is testing recovery.
    // The next request will be a "probe" - if it succeeds, circuit closes;
    // if it fails, circuit reopens immediately.
    circuitBreaker.on('halfOpen', () => {
      this.logger.verbose?.(
        'Circuit breaker entering half-open state - probing for recovery',
        LogContext.AUTH_EVALUATION
      );
    });

    // 'close' event: Probe request succeeded, service has recovered.
    // Reset the consecutive failure counter since we're back to normal operation.
    circuitBreaker.on('close', () => {
      this.consecutiveFailures = 0;
      this.logger.verbose?.(
        'Circuit breaker closed - service recovered',
        LogContext.AUTH_EVALUATION
      );
    });

    // 'timeout' event: A request exceeded the configured timeout.
    // Note: We handle timeouts via RxJS, so this may not fire frequently.
    circuitBreaker.on('timeout', () => {
      this.logger.verbose?.('Request timed out', LogContext.AUTH_EVALUATION);
    });

    // 'reject' event: Request was rejected because circuit is open.
    // This can fire very frequently during an outage (once per blocked request),
    // so we rate-limit logging to once per reset_timeout interval to prevent
    // log flooding while still providing visibility into ongoing issues.
    circuitBreaker.on('reject', () => {
      const now = Date.now();
      if (now - this.lastRejectLogTime > this.REJECT_LOG_INTERVAL) {
        this.logger.warn(
          {
            message: 'Circuit breaker rejecting requests',
            failureCount: this.consecutiveFailures,
            retryAfter: this.calculateRetryAfter(),
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
   * This value is included in CircuitOpenResponse to help clients
   * implement intelligent retry strategies.
   *
   * @returns Milliseconds until the circuit will attempt recovery
   */
  private calculateRetryAfter(): number {
    const stats = this.circuitBreaker.stats;
    const now = Date.now();
    // Note: opossum doesn't expose the exact time the circuit opened,
    // so we approximate based on reset_timeout from current time
    const lastFailureTime = stats && 'latencyMean' in stats ? now : now;
    const resetTimeout = this.cbConfig.reset_timeout;
    return Math.max(0, resetTimeout - (now - lastFailureTime));
  }

  /**
   * Executes an authorization request with retry logic for transient failures.
   *
   * Implements exponential backoff between retry attempts. Certain errors
   * (like "no subscribers listening") are not retried as they indicate
   * the service is not running rather than a transient issue.
   *
   * @param request - The authorization evaluation request
   * @returns The successful evaluation response
   * @throws The last error encountered if all retries are exhausted
   */
  private async evaluateWithRetry(
    request: AuthEvaluationRequest
  ): Promise<AuthEvaluationResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.max_attempts; attempt++) {
      try {
        const result = await this.executeNatsRequest(request);
        // Reset consecutive failures on success
        this.consecutiveFailures = 0;
        return result;
      } catch (error) {
        lastError = error as Error;

        // FR-016: Don't retry on "no subscribers listening" - service not running
        if (this.isNoSubscribersError(lastError)) {
          this.consecutiveFailures++;
          throw lastError;
        }

        // Count failure toward circuit threshold
        this.consecutiveFailures++;

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
          break;
        }
      }
    }

    throw lastError ?? new Error('Auth evaluation failed after retries');
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
   * - Timeouts (request didn't complete in time)
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
