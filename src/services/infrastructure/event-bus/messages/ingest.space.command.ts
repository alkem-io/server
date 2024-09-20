import { IEvent } from '@nestjs/cqrs';
import { registerEnumType } from '@nestjs/graphql';

export enum SpaceIngestionPurpose {
  KNOWLEDGE = 'knowledge',
  CONTEXT = 'context',
}

registerEnumType(SpaceIngestionPurpose, { name: 'SpaceIngestionPurpose' });

export class IngestSpace implements IEvent {
  constructor(
    public readonly spaceId: string,
    public readonly purpose: SpaceIngestionPurpose,
    public readonly personaServiceId?: string
  ) {}
}
