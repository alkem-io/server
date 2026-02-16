import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Template } from '../template/template.entity';
import { ITemplatesSet } from './templates.set.interface';

export class TemplatesSet extends AuthorizableEntity implements ITemplatesSet {
  templates!: Template[];
}
