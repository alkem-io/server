import { Column, Entity, ManyToOne } from 'typeorm';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';

@Entity()
export class PostTemplate extends TemplateBase implements IPostTemplate {
  @ManyToOne(() => TemplatesSet, templatesSet => templatesSet.postTemplates, {
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
