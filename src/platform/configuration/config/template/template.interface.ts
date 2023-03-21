import { IOpportunityTemplate } from './opportunity.template.interface';
import { IUserTemplate } from './user.template.interface';

export interface ITemplate {
  name: string;
  description?: string;
  users?: IUserTemplate[];
  opportunities?: IOpportunityTemplate[];
}
