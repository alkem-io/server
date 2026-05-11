import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { IngestError, IngestionPurpose, IngestionResult } from './types';

// The result-message wire format is `{"response": {...}}` — the subscriber
// shallow-copies top-level keys onto a new event instance, so `event.response`
// is the only field actually populated. This DTO mirrors
// `IngestBodyOfKnowledgeResult` so the two ingest result types share a single
// shape (the `original` split was historical and never matched the wire).
export class IngestWebsiteResponse {
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

export class IngestWebsiteResult implements IEvent {
  constructor(public readonly response: IngestWebsiteResponse) {}
}
