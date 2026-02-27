import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { TagsetType } from '@common/enums/tagset.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseAlkemioEntity } from '../entity/base-entity';
import { Tagset } from '../tagset/tagset.entity';

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
    length: SMALL_TEXT_LENGTH,
    nullable: false,
  })
  name!: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  type!: TagsetType;

  @Column('simple-array', { nullable: false })
  allowedValues!: string[];

  @Column('varchar', {
    length: 255,
    nullable: true,
  })
  defaultSelectedValue?: string;

  @OneToMany(
    () => Tagset,
    tagset => tagset.tagsetTemplate,
    {
      eager: false,
      cascade: false, // This must be false, the tagsets are owned by the classification, not the template
    }
  )
  tagsets?: Tagset[];

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
