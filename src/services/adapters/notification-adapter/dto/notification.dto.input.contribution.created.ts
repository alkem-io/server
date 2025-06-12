import { NotificationInputBase } from './notification.dto.input.base';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';

export interface NotificationInputContributionCreated
  extends NotificationInputBase {
  callout: ICallout;
  contribution: ICalloutContribution;
}
