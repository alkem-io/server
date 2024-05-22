import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { TemplateBase } from '../template-base/template.base.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { ICommunityGuidelinesTemplate } from './community.guidelines.template.interface';

@Entity()
export class CommunityGuidelinesTemplate
  extends TemplateBase
  implements ICommunityGuidelinesTemplate
{
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.communityGuidelinesTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @OneToOne(() => CommunityGuidelines, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidelines!: CommunityGuidelines;
}
