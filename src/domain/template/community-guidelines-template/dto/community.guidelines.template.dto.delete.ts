import { InputType } from '@nestjs/graphql';
import { DeleteTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.delete';

@InputType()
export class DeleteCommunityGuidelinesTemplateInput extends DeleteTemplateBaseInput {}
