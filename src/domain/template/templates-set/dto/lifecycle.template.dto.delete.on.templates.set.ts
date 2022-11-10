import { DeleteTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.delete';
import { InputType } from '@nestjs/graphql';

@InputType()
export class DeleteLifecycleTemplateInput extends DeleteTemplateBaseInput {}
