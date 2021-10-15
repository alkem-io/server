import { IOpportunityTemplate } from './opportunity.template.interface';
import { IUserTemplate } from './user.template.interface';
import { IOrganizationTemplate } from './organization.template.interface';

export interface ITemplate {
  name: string;
  description?: string;
  users?: IUserTemplate[];
  opportunities?: IOpportunityTemplate[];
  organizations?: IOrganizationTemplate[];
}
