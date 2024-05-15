import { IEvent } from '@nestjs/cqrs';

export enum SpaceIngestionPurpose {
  Knowledge = 'knowledge',
  Context = 'context',
}

export class IngestSpace implements IEvent {
  constructor(
    public readonly spaceId: string,
    public readonly purpose: SpaceIngestionPurpose
  ) {}
}
