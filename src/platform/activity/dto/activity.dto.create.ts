import { ActivityEventType } from '@common/enums/activity.event.type';

export class CreateActivityInput {
  triggeredBy!: string;

  resourceID!: string;
  collaborationID!: string;

  description!: string;

  type!: ActivityEventType;
}
