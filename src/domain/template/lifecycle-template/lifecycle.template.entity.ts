import { Column, Entity, ManyToOne } from 'typeorm';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { ILifecycleTemplate } from '@domain/template/lifecycle-template/lifecycle.template.interface';

@Entity()
export class LifecycleTemplate
  extends TemplateBase
  implements ILifecycleTemplate
{
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.lifecycleTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @Column('longtext', { nullable: false })
  definition!: string;

  @Column({ default: LifecycleType.CHALLENGE })
  type: string;

  constructor() {
    super();
    this.type = '';
  }
}
