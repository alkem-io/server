import { ITagsetTemplateOld } from './user.template.interface';

export interface IOrganizationTemplate {
  name: string;
  tagsets?: ITagsetTemplateOld[];
}
