import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputMessageRemoved extends ActivityInputBase {
  messageID!: string;
}
