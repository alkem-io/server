import { ContributionType } from '@services/external/elasticsearch/types/contribution.type';

export type ContributionDocument = {
  id: string;
  name: string;
  author: string;
  type: ContributionType;
  timestamp: Date;
  alkemio: boolean;
};
