import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { IEvent } from '@nestjs/cqrs';
import { registerEnumType } from '@nestjs/graphql';

export enum IngestionPurpose {
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

registerEnumType(IngestionPurpose, { name: 'IngestionPurpose' });

export class IngestBodyOfKnowledge implements IEvent {
  constructor(
    public readonly bodyOfKnowledgeId: string,
    public readonly type: VirtualContributorBodyOfKnowledgeType,
    public readonly purpose: IngestionPurpose,
    public readonly personaId?: string
  ) {}
}
