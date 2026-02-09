import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, OneToMany } from 'typeorm';
import { Template } from '../template/template.entity';
import { ITemplatesSet } from './templates.set.interface';

@Entity()
export class TemplatesSet extends AuthorizableEntity implements ITemplatesSet {
  @OneToMany(
    () => Template,
    template => template.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  templates!: Template[];
}
