import { Entity, OneToMany } from 'typeorm';
import { TagsetTemplate } from '../tagset-template/tagset.template.entity';
import { ITagsetTemplateSet } from './tagset.template.set.interface';
import { BaseAlkemioEntity } from '../entity/base-entity';

@Entity()
export class TagsetTemplateSet
  extends BaseAlkemioEntity
  implements ITagsetTemplateSet
{
  @OneToMany(
    () => TagsetTemplate,
    tagsetTemplate => tagsetTemplate.tagsetTemplateSet,
    {
      eager: true,
      cascade: true,
    }
  )
  tagsetTemplates!: TagsetTemplate[];
}
