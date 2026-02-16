import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TemplateDefault } from '../template-default/template.default.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { ITemplatesManager } from './templates.manager.interface';

export class TemplatesManager
  extends AuthorizableEntity
  implements ITemplatesManager
{
  templatesSet?: TemplatesSet;

  templateDefaults!: TemplateDefault[];
}
