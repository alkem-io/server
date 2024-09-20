import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
@ObjectType('CreateInnovationFlowStateData')
export class CreateInnovationFlowStateInput {
  @Field(() => String, {
    nullable: false,
    description: 'The display name for the State',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The explation text to clarify the State.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
