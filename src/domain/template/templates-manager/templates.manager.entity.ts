import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { TemplateDefault } from '../template-default/template.default.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { ITemplatesManager } from './templates.manager.interface';

@Entity()
export class TemplatesManager
  extends AuthorizableEntity
  implements ITemplatesManager
{
  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  @OneToMany(
    () => TemplateDefault,
    templateDefault => templateDefault.templatesManager,
    {
      eager: false,
      cascade: true,
    }
  )
  templateDefaults!: TemplateDefault[];
}
