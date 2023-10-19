import { NotificationInputBase } from './notification.dto.input.base';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { ICallout } from '@domain/collaboration/callout';

export interface NotificationInputContributionCreated
  extends NotificationInputBase {
  callout: ICallout;
  contribution: ICalloutContribution;
}
