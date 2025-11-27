/**
 * Auth Remote Evaluation Service - Circuit Breaker Contracts
 * Feature: 017-auth-circuit-breaker
 *
 * This file defines the TypeScript interfaces and types for the circuit breaker
 * implementation. These will be placed in:
 * src/services/external/auth-remote-evaluation/auth.remote.evaluation.types.ts
 */

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Circuit breaker configuration options.
 * Mapped from alkemio.yml via ConfigService.
 */
export interface AuthEvaluationCircuitBreakerConfig {
  /**
   * Whether circuit breaker functionality is enabled.
   * When false, requests pass through without circuit protection.
   * @default true
   */
  enabled: boolean;

  /**
   * Request timeout in milliseconds.
   * Requests exceeding this duration are considered failures.
   * @default 3000 (3 seconds)
   */
  timeout: number;

  /**
   * Number of consecutive failures required to open the circuit.
   * @default 15
   */
  failure_threshold: number;

  /**
   * Time in milliseconds before circuit transitions from open to half-open.
   * @default 45000 (45 seconds)
   */
  reset_timeout: number;
}

/**
 * Retry configuration for transient failure handling.
 */
export interface AuthEvaluationRetryConfig {
  /**
   * Maximum number of retry attempts before giving up.
   * Does not include the initial attempt.
   * @default 5
   */
  max_attempts: number;

  /**
   * Base delay in milliseconds for the first retry.
   * @default 500
   */
  base_delay: number;

  /**
   * Multiplier for exponential backoff calculation.
   * delay = base_delay * (multiplier ^ attempt)
   * @default 2
   */
  backoff_multiplier: number;
}

/**
 * Combined configuration for the auth evaluation service.
 * Path in alkemio.yml: microservices.auth_evaluation
 */
export interface AuthEvaluationConfig {
  circuit_breaker: AuthEvaluationCircuitBreakerConfig;
  retry: AuthEvaluationRetryConfig;
}

// ============================================================================
// Response Interfaces
// ============================================================================

/**
 * Standard authorization evaluation response.
 * Returned when circuit is closed and request completes normally.
 * (Existing interface - preserved for compatibility)
 */
export interface AuthEvaluationResponse {
  /** Whether the authorization request was granted */
  allowed: boolean;
  /** Human-readable explanation of the decision */
  reason: string;
}

/**
 * Request payload for authorization evaluation.
 * (Existing interface - preserved for compatibility)
 */
export interface AuthEvaluationRequest {
  /** UUID of the agent requesting authorization */
  agentId: string;
  /** UUID of the authorization policy to evaluate against */
  authorizationPolicyId: string;
  /** The privilege being requested */
  privilege: string;
}

/**
 * Metadata included in circuit-open denial responses.
 */
export interface CircuitOpenDenialMetadata {
  /** Current circuit breaker state */
  circuitState: 'open';
  /** Number of consecutive failures that triggered circuit open */
  failureCount: number;
}

/**
 * Response returned when circuit breaker is open.
 * Extends AuthEvaluationResponse to maintain interface compatibility.
 *
 * Satisfies FR-020:
 * - allowed: false (fail-closed security model)
 * - reason: structured description of unavailability
 * - metadata: circuit state and failure count
 * - retryAfter: milliseconds until recovery attempt
 */
export interface CircuitOpenResponse extends AuthEvaluationResponse {
  allowed: false;
  reason: string;
  metadata: CircuitOpenDenialMetadata;
  /**
   * Milliseconds until the circuit breaker will attempt recovery.
   * Clients can use this to implement intelligent retry logic.
   */
  retryAfter: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to identify circuit-open responses.
 * Useful for consumers to handle service unavailability differently.
 */
export function isCircuitOpenResponse(
  response: AuthEvaluationResponse
): response is CircuitOpenResponse {
  return (
    response.allowed === false &&
    'metadata' in response &&
    (response as CircuitOpenResponse).metadata?.circuitState === 'open'
  );
}

// ============================================================================
// Internal Types (not exported from module index)
// ============================================================================

/**
 * Circuit breaker state enumeration.
 * Mirrors opossum's internal state representation.
 */
export type CircuitState = 'closed' | 'open' | 'halfOpen';

/**
 * Opossum circuit breaker options.
 * Subset of options used by this implementation.
 */
export interface OpossumOptions {
  timeout: number;
  errorThresholdPercentage: number;
  volumeThreshold: number;
  resetTimeout: number;
}

/**
 * Configuration defaults for use when values not provided.
 */
export const AUTH_EVALUATION_CONFIG_DEFAULTS: AuthEvaluationConfig = {
  circuit_breaker: {
    enabled: true,
    timeout: 3000,
    failure_threshold: 15,
    reset_timeout: 45000,
  },
  retry: {
    max_attempts: 5,
    base_delay: 500,
    backoff_multiplier: 2,
  },
};
