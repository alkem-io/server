import { Field, InputType } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateNVPInput {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: false })
  @MaxLength(MID_TEXT_LENGTH)
  value!: string;

  @Field(() => Number, { nullable: false })
  sortOrder!: number;
}
