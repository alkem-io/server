import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { IngestError, IngestionPurpose, IngestionResult } from './types';

export class IngestBodyOfKnowledgeResult implements IEvent {
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
