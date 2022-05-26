import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateAspectTemplateInput extends CreateTemplateBaseInput {}
