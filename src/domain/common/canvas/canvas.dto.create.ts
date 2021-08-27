import { VERY_LONG_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateNVPInput {
  @Field(() => String, { nullable: false })
  name!: string;

  @Field(() => String, { nullable: false })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value!: string;
}
