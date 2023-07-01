import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';

export class UpdateTagsetTemplateInput extends UpdateBaseAlkemioInput {
  name?: string;

  allowedValues?: string[];
}
