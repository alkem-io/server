import { IEvent } from '@nestjs/cqrs';
import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { IngestionResult, IngestionPurpose, IngestError } from './types';
import { IngestWebsite } from './ingest.website';

export class IngestWebsiteResult implements IEvent {
  constructor(
    public readonly baseUrl: string,
    public readonly type: AiPersonaBodyOfKnowledgeType,
    public readonly purpose: IngestionPurpose,
    public readonly personaServiceId: string,
    public readonly timestamp: number,
    public readonly original: IngestWebsite,
    public result: IngestionResult,
    public error?: IngestError
  ) {}
}
