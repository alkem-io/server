import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
export class UpdateInnovationFlowStateInput {
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
