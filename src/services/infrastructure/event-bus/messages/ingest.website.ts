import { AiPersonaBodyOfKnowledgeType } from '@common/enums/ai.persona.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { registerEnumType } from '@nestjs/graphql';

export enum IngestionPurpose {
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

registerEnumType(IngestionPurpose, { name: 'IngestionPurpose' });

export class IngestWebsite implements IEvent {
  constructor(
    public readonly baseUrl: string,
    public readonly type: AiPersonaBodyOfKnowledgeType,
    public readonly purpose: IngestionPurpose,
    public readonly personaServiceId?: string
  ) {}
}
