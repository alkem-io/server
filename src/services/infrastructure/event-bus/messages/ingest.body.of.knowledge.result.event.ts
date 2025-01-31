import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';

export enum IngestionPurpose {
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

export enum IngestionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum ErrorCode {
  VECTOR_INSERT = 'vector_insert',
}

type IngestError = {
  code?: ErrorCode;
  message: string;
};

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
