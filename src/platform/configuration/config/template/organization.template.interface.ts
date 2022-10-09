import { ITagsetTemplate } from './user.template.interface';

export interface IOrganizationTemplate {
  name: string;
  tagsets?: ITagsetTemplate[];
}
