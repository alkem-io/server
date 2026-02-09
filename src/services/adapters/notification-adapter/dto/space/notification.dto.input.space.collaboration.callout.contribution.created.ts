import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCollaborationCalloutContributionCreated
  extends NotificationInputBase {
  callout: ICallout;
  contribution: ICalloutContribution;
  contributionType: string;
}
