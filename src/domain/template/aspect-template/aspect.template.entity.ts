import { Column, Entity, ManyToOne } from 'typeorm';
import { IAspectTemplate } from '@domain/template/aspect-template/aspect.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';

@Entity()
export class AspectTemplate extends TemplateBase implements IAspectTemplate {
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.aspectTemplates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
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
