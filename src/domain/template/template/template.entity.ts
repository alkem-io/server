import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { TemplateType } from '@common/enums/template.type';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { IClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { TemplateContentSpace } from '../template-content-space/template.content.space.entity';
import { ITemplate } from './template.interface';

@Entity()
export class Template extends NameableEntity implements ITemplate {
  // Unique sequential cursor column for relay-style pagination (docs/Pagination.md)
  @Column({
    unique: true,
    nullable: false,
  })
  @Generated('increment')
  rowId!: number;

  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.templates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @OneToOne(() => Profile, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  declare profile: Profile;

  @Column('varchar', { length: 128, nullable: false })
  type!: TemplateType;

  @Column('text', { nullable: true })
  postDefaultDescription?: string;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  communityGuidelines?: CommunityGuidelines;

  @OneToOne(() => Callout, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  callout?: Callout;

  @OneToOne(() => Whiteboard, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboard?: Whiteboard;

  @OneToOne(() => TemplateContentSpace, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contentSpace?: TemplateContentSpace;

  // Classification Template storage (type === CLASSIFICATION). Nullable by
  // necessity — one `template` table serves every TemplateType — so I-9
  // (template.service.ts) is what stops a CLASSIFICATION template ever
  // existing with either column empty.
  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  classificationCardinality?: ClassificationCardinality;

  @Column('jsonb', { nullable: true })
  classificationValueSet?: IClassificationValue[];
}
