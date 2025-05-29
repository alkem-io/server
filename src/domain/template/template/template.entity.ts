import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateType } from '@common/enums/template.type';
import { ITemplate } from './template.interface';
import { Profile } from '@domain/common/profile/profile.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { Callout } from '@domain/collaboration/callout';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Collaboration } from '@domain/collaboration/collaboration';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { TemplateContentSpace } from '../template-content-space/template.content.space.entity';

@Entity()
export class Template extends NameableEntity implements ITemplate {
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.templates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
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

  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @OneToOne(() => TemplateContentSpace, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  space?: TemplateContentSpace;
}
