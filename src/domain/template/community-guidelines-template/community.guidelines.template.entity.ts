import { Entity, ManyToOne } from 'typeorm';
import { TemplateBase } from '../template-base/template.base.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { ITemplateBase } from '../template-base/template.base.interface';

@Entity()
export class CommunityGuidelinesTemplate
  extends TemplateBase
  implements ITemplateBase
{
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.communityGuidelinesTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;
}
