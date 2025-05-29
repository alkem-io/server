import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTemplateFromSpaceInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Template.',
  })
  templateID!: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'The Space whose content should be copied to this Template.',
  })
  spaceID!: string;
}
