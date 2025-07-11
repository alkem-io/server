import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CreateTemplateBaseInput } from '@domain/template/template/dto/template.dto.create.base';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTemplateFromSpaceOnTemplatesSetInput extends CreateTemplateBaseInput {
  @Field(() => UUID, { nullable: false })
  templatesSetID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Space to use as the content for the Template.',
  })
  spaceID!: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether to reproduce the hierarchy or just the space.',
  })
  recursive?: boolean;
}
