import { Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ITemplatesSet } from './templates.set.interface';
import { Template } from '../template/template.entity';
import { WhiteboardTemplate } from '../whiteboard-template/whiteboard.template.entity';

@Entity()
export class TemplatesSet extends AuthorizableEntity implements ITemplatesSet {
  @OneToMany(() => Template, template => template.templatesSet, {
    eager: false,
    cascade: true,
  })
  templates!: Template[];

  @OneToMany(
    () => WhiteboardTemplate,
    whiteboardTemplate => whiteboardTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  whiteboardTemplates!: WhiteboardTemplate[];
}
