import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { IngestionResult, IngestionPurpose, IngestError } from './types';

export class IngestBodyOfKnowledgeResult implements IEvent {
  constructor(
    public readonly bodyOfKnowledgeId: string,
    public readonly type: AiPersonaBodyOfKnowledgeType,
    public readonly purpose: IngestionPurpose,
    public readonly personaServiceId: string,
    public readonly timestamp: number,
    public result: IngestionResult,
    public error?: IngestError
  ) {}
}
