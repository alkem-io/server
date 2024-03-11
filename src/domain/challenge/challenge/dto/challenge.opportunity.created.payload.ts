import { BaseSubscriptionPayload } from '@src/common/interfaces';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';

export interface OpportunityCreatedPayload extends BaseSubscriptionPayload {
  challengeID: string;
  opportunity: IOpportunity;
}
