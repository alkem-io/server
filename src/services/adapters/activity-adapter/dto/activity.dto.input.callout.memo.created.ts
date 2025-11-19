import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputCalloutMemoCreated extends ActivityInputBase {
  memo!: IMemo;
  callout!: ICallout;
}
