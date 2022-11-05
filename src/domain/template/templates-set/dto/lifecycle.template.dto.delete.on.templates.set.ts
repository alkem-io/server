import { UUID } from '@domain/common/scalars/scalar.uuid';
import { DeleteTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.delete';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteLifecycleTemplateOnTemplatesSetInput extends DeleteTemplateBaseInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;
}
