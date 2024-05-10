import { InputType } from '@nestjs/graphql';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';

@InputType()
export class CreateCommunityGuidelinesTemplateInput extends CreateTemplateBaseInput {}
