import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { Profile } from '@domain/common/profile';

@Entity()
export class InnovationFlowTemplate
  extends TemplateBase
  implements IInnovationFlowTemplate
{
  @Index('FK_76546450cf75dc486700ca034c6')
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

  @Index('FK_79991450cf75dc486700ca034c6')
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
