import { ActivityEventType } from '@common/enums/activity.event.type';
import { ActivityInputBase } from '@services/adapters/activity-adapter/dto/activity.dto.input.base';

export class CreateActivityInput extends ActivityInputBase {
  resourceID!: string;
  description!: string;
  collaborationID!: string;
  parentID!: string;
  type!: ActivityEventType;
}
