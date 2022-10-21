import { ActivityEventType } from '@common/enums/activity.event.type';
import { IUser } from '@domain/community';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';

export class ActivityLogEntryBase implements IActivityLogEntryBase {
  id!: string;
  triggeredBy!: IUser;
  createdDate!: Date;
  collaborationID!: string;
  type!: ActivityEventType;
  description?: string;
}
