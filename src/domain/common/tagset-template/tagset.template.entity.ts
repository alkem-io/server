import { TagsetType } from '@common/enums/tagset.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { Tagset } from '../tagset/tagset.entity';

export enum RestrictedTagsetTemplateNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

export class TagsetTemplate
  extends BaseAlkemioEntity
  implements ITagsetTemplate
{
  name!: string;

  type!: TagsetType;

  allowedValues!: string[];

  defaultSelectedValue?: string;

  tagsets?: Tagset[];

  tagsetTemplateSet?: TagsetTemplateSet;

  constructor(
    name: string,
    type: TagsetType,
    allowedValues: string[],
    defaultSelectedValue?: string
  ) {
    super();
    this.name = name;
    this.type = type;
    this.allowedValues = allowedValues;
    this.defaultSelectedValue = defaultSelectedValue;
  }
}
