import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { IMessage } from '@domain/communication/message/message.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputAspectComment extends ActivityInputBase {
  aspect!: IAspect;
  message!: IMessage;
}
