import { Column, Entity, ManyToOne } from 'typeorm';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';

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

  @Column('longtext', { nullable: false })
  states!: string;

  constructor() {
    super();
  }
}
