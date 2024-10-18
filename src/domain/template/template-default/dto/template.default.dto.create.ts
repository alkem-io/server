import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import { ITemplate } from '@domain/template/template/template.interface';

export class CreateTemplateDefaultInput {
  type!: TemplateDefaultType;

  template?: ITemplate;

  allowedTemplateType!: TemplateType;
}
