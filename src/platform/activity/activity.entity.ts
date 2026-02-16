import { ActivityEventType } from '@common/enums/activity.event.type';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IActivity } from './activity.interface';

export class Activity extends BaseAlkemioEntity implements IActivity {
  rowId!: number;

  triggeredBy!: string;

  resourceID!: string;

  parentID?: string;

  collaborationID!: string;

  messageID!: string;

  visibility!: boolean;

  description?: string;

  type!: ActivityEventType;
}
