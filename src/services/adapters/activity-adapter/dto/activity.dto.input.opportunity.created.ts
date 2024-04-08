import { ISpace } from '@domain/challenge/space/space.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputOpportunityCreated extends ActivityInputBase {
  opportunity!: ISpace;
  challengeId!: string;
}
