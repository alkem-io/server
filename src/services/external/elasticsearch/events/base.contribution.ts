import { ContributionType } from '../types/contribution.type';

export interface BaseContribution {
  id: string;
  name: string;
  author: string;
  type: ContributionType;
  timestamp: Date;
}
