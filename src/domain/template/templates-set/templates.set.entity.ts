import { Column, Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ITemplatesSet } from './templates.set.interface';
import { AspectTemplate } from '../aspect-template/aspect.template.entity';
import { CanvasTemplate } from '../canvas-template/canvas.template.entity';
import { LifecycleTemplate } from '../lifecycle-template/lifecycle.template.entity';

@Entity()
export class TemplatesSet extends AuthorizableEntity implements ITemplatesSet {
  @OneToMany(
    () => AspectTemplate,
    aspectTemplate => aspectTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  aspectTemplates?: AspectTemplate[];

  @OneToMany(
    () => CanvasTemplate,
    canvasTemplate => canvasTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  canvasTemplates?: CanvasTemplate[];

  @OneToMany(
    () => LifecycleTemplate,
    lifecycleTemplate => lifecycleTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  lifecycleTemplates?: LifecycleTemplate[];

  @Column('text')
  policy!: string;
}
