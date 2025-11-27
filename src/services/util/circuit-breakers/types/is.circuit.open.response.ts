import { CircuitOpenDenialMetadata } from './circuit.open.denial.metadata';
import { CircuitOpenResponse } from './circuit.open.response';

/**
 * Type guard to identify circuit-open responses.
 * Useful for consumers to handle service unavailability differently.
 */
export function isCircuitOpenResponse(
  response: unknown
): response is CircuitOpenResponse {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const candidate = response as Record<string, unknown>;
  return (
    'metadata' in candidate &&
    typeof candidate.metadata === 'object' &&
    candidate.metadata !== null &&
    (candidate.metadata as CircuitOpenDenialMetadata).circuitState === 'open'
  );
}
