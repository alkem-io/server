import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InnovationFlowState')
export abstract class IInnovationFlowState {
  @Field(() => String, {
    nullable: false,
    description: 'The display name for the State',
  })
  displayName!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The explanation text to clarify the state.',
  })
  description!: string;
}
