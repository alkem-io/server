import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ITemplatesManager } from './templates.manager.interface';
import { TemplateDefault } from '../template-default/template.default.entity';
import { TemplatesSet } from '@domain/template/templates-set';

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
