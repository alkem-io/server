import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { Profile } from '@domain/common/profile';

@Entity()
export class InnovationFlowTemplate
  extends TemplateBase
  implements IInnovationFlowTemplate
{
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.innovationFlowTemplates,
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
  profile!: Profile;

  @Column('text', { nullable: false })
  states: string = '[]';

  constructor() {
    super();
  }
}
