import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateTemplateBaseInput } from '@domain/template/template/dto/template.dto.create.base';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTemplateFromContentSpaceOnTemplatesSetInput extends CreateTemplateBaseInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the ContentSpace to use as for the Template.',
  })
  contentSpaceID!: string;
}
