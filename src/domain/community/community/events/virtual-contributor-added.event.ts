import { IEvent } from '@nestjs/cqrs';

export class VirtualContributorAdded implements IEvent {
  constructor(
    public readonly spaceId: string,
    public readonly contributorId: string
  ) {}
}
