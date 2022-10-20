import { BaseSubscriptionPayload } from '@src/common';
import { IOpportunity } from '../../../collaboration/opportunity/opportunity.interface';

export interface OpportunityCreatedPayload extends BaseSubscriptionPayload {
  challengeID: string;
  opportunity: IOpportunity;
}
