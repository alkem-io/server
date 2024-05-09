import { Column, Entity, ManyToOne } from 'typeorm';
import { TemplateBase } from '../template-base/template.base.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { IMemberGuidelinesTemplate } from './member.guidelines.template.interface';

@Entity()
export class MemberGuidelinesTemplate
  extends TemplateBase
  implements IMemberGuidelinesTemplate
{
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.memberGuidelinesTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @Column('text')
  defaultDescription: string;

  @Column('text')
  type: string;

  constructor() {
    super();
    this.type = '';
    this.defaultDescription = '';
  }
}
