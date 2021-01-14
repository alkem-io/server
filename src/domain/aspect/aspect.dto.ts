import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, VERY_LONG_TEXT_LENGTH } from '@constants';
import { MaxLength } from 'class-validator';

@InputType()
export class AspectInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  title!: string;

  @Field({ nullable: true })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  framing!: string;

  @Field({ nullable: true })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  explanation!: string;
}
