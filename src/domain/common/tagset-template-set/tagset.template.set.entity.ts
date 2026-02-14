import { BaseAlkemioEntity } from '../entity/base-entity';
import { TagsetTemplate } from '../tagset-template/tagset.template.entity';
import { ITagsetTemplateSet } from './tagset.template.set.interface';

export class TagsetTemplateSet
  extends BaseAlkemioEntity
  implements ITagsetTemplateSet
{
  tagsetTemplates!: TagsetTemplate[];
}
