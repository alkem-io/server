import { Column, Entity, ManyToOne } from 'typeorm';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { TagsetType } from '@common/enums/tagset.type';

export enum RestrictedTagsetTemplateNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

@Entity()
export class TagsetTemplate
  extends BaseAlkemioEntity
  implements ITagsetTemplate
{
  @Column('varchar', {
    default: RestrictedTagsetTemplateNames.DEFAULT,
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column('varchar', {
    default: TagsetType.FREEFORM,
    length: 255,
    nullable: false,
  })
  type!: TagsetType;

  @Column('simple-array')
  allowedValues!: string[];

  @ManyToOne(
    () => TagsetTemplateSet,
    tagsetTemplateSet => tagsetTemplateSet.tagsetTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  tagsetTemplateSet?: TagsetTemplateSet;

  constructor(name: string, type: TagsetType, allowedValues: string[]) {
    super();
    this.name = name;
    this.type = type;
    this.allowedValues = allowedValues;
  }
}
