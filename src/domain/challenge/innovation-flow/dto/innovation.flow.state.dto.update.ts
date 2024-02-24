import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class UpdateInnovationFlowStateInput {
  @Field(() => String, {
    nullable: false,
    description: 'The display name for the State',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The explation text to clarify the State.',
  })
  @MaxLength(MID_TEXT_LENGTH)
  explanation!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The sort order of this question in a wider set of questions.',
  })
  sortOrder!: number;
}
