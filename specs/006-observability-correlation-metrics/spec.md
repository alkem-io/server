# Feature Specification: Correlation ID & Metrics Standardization

**Feature Branch**: `006-observability-correlation-metrics`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Establish required correlation ID propagation and baseline operational metrics per principle 5."

## Execution Flow (main)

```
1. Parse description
2. Identify: correlation scope, metric taxonomy
3. Mark ambiguities
4. Scenarios
5. Requirements
6. Entities
```

## User Scenarios & Testing

### Primary User Story

As an SRE, I want every request and domain event to carry a correlation ID and produce standardized metrics so that I can trace and measure system behavior reliably.

### Acceptance Scenarios

1. **Given** an inbound GraphQL request, **When** it is processed, **Then** logs include correlationId, userId (if authenticated), and operationName.
2. **Given** a downstream HTTP/Rabbit call, **When** it is made, **Then** correlationId header/property is forwarded.
3. **Given** an unhandled exception, **When** it is logged, **Then** correlationId is present in error log.
4. **Given** a metrics endpoint scrape, **When** requested, **Then** baseline counters and histograms (request latency, error count, event emission count) are exposed.
5. **Given** a missing correlationId in inbound request, **When** processing begins, **Then** system generates one and tags logs with generated=true flag.

### Edge Cases

- Batched GraphQL operations → each operation tagged distinct child span. [NEEDS CLARIFICATION: do we allow batching?]
- Background jobs lacking inbound request → synthetic root correlation.

## Requirements

### Functional Requirements

- **FR-001**: System MUST assign or propagate a `correlationId` for every inbound request and asynchronous job.
- **FR-002**: Logs MUST include `correlationId` and `context` fields.
- **FR-003**: Metrics taxonomy MUST define: request_latency (histogram), request_errors (counter), domain_events_emitted (counter), external_call_latency (histogram), external_call_failures (counter).
- **FR-004**: Missing inbound correlationId MUST trigger generation with deterministic UUID v4.
- **FR-005**: CorrelationId MUST propagate through domain event envelopes.
- **FR-006**: Metrics endpoint MUST expose all baseline metrics within 1 scrape interval after process start.
- **FR-007**: Metric labels MUST exclude high-cardinality user identifiers (use role tier only). [NEEDS CLARIFICATION: allowed labels]
- **FR-008**: System MUST reject manual logging calls omitting correlation (lint/gate). [NEEDS CLARIFICATION: enforcement approach]
- **FR-009**: External calls MUST record latency and outcome (success|error|timeout) metrics.
- **FR-010**: Structured log format MUST be JSON with level, timestamp, correlationId.

### Key Entities

- **CorrelationContext**: Holds ids (correlation, causation, user, tenant).
- **MetricDefinition**: Name, type, labels, description.

## Review & Acceptance Checklist

(Template)

## Execution Status

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed
