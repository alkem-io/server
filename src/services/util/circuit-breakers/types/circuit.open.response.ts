import { CircuitOpenDenialMetadata } from './circuit.open.denial.metadata';

/**
 * Response returned when circuit breaker is open.
 * Generic circuit-open metadata that can be combined with domain-specific responses.
 *
 * Satisfies FR-020:
 * - reason: structured description of unavailability
 * - metadata: circuit state and failure count
 * - retryAfter: milliseconds until recovery attempt
 */
export interface CircuitOpenResponse {
  reason: string;
  metadata: CircuitOpenDenialMetadata;
  /**
   * Milliseconds until the circuit breaker will attempt recovery.
   * Clients can use this to implement intelligent retry logic.
   */
  retryAfter: number;
}
