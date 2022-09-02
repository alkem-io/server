import { ActivityEventType } from '@common/enums/activity.event.type';

export class CreateActivityInput {
  triggeredBy!: string;

  resourceID!: string;

  description!: string;

  type!: ActivityEventType;
}
