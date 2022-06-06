import { Column, Entity, ManyToOne } from 'typeorm';
import { ICanvasTemplate } from './canvas.template.interface';
import { TemplateBase } from '../template-base/template.base.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';

@Entity()
export class CanvasTemplate extends TemplateBase implements ICanvasTemplate {
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.canvasTemplates, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  templatesSet?: TemplatesSet;

  @Column('longtext', { nullable: false })
  value!: string;

  constructor() {
    super();
    this.value = '';
  }
}
