import { IOpportunityTemplate } from './opportunity.template.interface';
import { IUserTemplate } from './user.template.interface';

export interface IUxTemplate {
  name: string;
  description?: string;
  users?: IUserTemplate[];
  opportunities?: IOpportunityTemplate[];
}
