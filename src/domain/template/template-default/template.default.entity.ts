import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IsEnum } from 'class-validator';
import { Template } from '../template/template.entity';
import { TemplatesManager } from '../templates-manager/templates.manager.entity';
import { ITemplateDefault } from './template.default.interface';

export class TemplateDefault
  extends AuthorizableEntity
  implements ITemplateDefault
{
  templatesManager?: TemplatesManager;

  type!: TemplateDefaultType;

  template?: Template;

  @IsEnum(TemplateType)
  allowedTemplateType!: TemplateType;
}
