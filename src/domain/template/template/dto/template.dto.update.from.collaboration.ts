import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateTemplateFromCollaborationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Template.',
  })
  templateID!: string;

  @Field(() => UUID, {
    nullable: false,
    description:
      'The Collaboration whose content should be copied to this Template.',
  })
  collaborationID!: string;
}
