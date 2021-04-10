import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateAspectInput {
  @Field({ nullable: false })
  parentID!: number;

  @Field({ nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  title!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  framing!: string;

  @Field({ nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  explanation!: string;
}
