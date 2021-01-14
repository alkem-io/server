import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class ActorInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  value!: string;

  @Field({ nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  impact!: string;
}
