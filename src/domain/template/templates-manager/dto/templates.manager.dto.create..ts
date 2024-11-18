import { CreateTemplateDefaultInput } from '@domain/template/template-default/dto/template.default.dto.create';

export class CreateTemplatesManagerInput {
  templateDefaultsData!: CreateTemplateDefaultInput[];
}
