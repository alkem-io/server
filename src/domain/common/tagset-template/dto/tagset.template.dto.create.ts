import { TagsetType } from '@common/enums/tagset.type';

export class CreateTagsetTemplateInput {
  name!: string;

  type!: TagsetType;

  allowedValues!: string[];

  defaultSelectedValue?: string;
}
