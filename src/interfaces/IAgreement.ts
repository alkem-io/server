import { ITag } from './ITag';
import { IOrganisation } from './IOrganisation';

export interface IAgreement {
    id: number;
    name: string;
    description: string;
    challengeLeads: IOrganisation;
    tags: ITag[];
  }