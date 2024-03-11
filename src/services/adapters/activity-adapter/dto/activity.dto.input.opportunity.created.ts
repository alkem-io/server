import { IOpportunity } from '@src/domain/challenge/opportunity';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputOpportunityCreated extends ActivityInputBase {
  opportunity!: IOpportunity;
  challengeId!: string;
}
