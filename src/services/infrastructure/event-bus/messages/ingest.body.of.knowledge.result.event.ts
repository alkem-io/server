import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { IngestError, IngestionPurpose, IngestionResult } from './types';

// The result-message wire format is `{"response": {...}}` — the subscriber
// shallow-copies top-level keys onto a new event instance, so `event.response`
// is the only field actually populated. Wrapping the payload in a typed
// `Response` member keeps the DTO honest and lets handlers read fields from
// `event.response.X` without runtime "undefined" hazards.
export class IngestBodyOfKnowledgeResponse {
  constructor(
    public readonly bodyOfKnowledgeId: string,
    public readonly type: VirtualContributorBodyOfKnowledgeType,
    public readonly purpose: IngestionPurpose,
    public readonly personaId: string,
    public readonly timestamp: number,
    public result: IngestionResult,
    public error?: IngestError
  ) {}
}

export class IngestBodyOfKnowledgeResult implements IEvent {
  constructor(public readonly response: IngestBodyOfKnowledgeResponse) {}
}
