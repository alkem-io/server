import { Column, Entity, ManyToOne } from 'typeorm';
import { ICanvasTemplate } from '@domain/template/canvas-template/canvas.template.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';

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
