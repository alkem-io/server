import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ReferenceInput } from '@domain/common/reference/reference.dto';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class ContextInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  background?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  vision?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  tagline?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  who?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  impact?: string;

  @Field(() => [ReferenceInput], {
    nullable: true,
    description: 'Set of references to _replace_ the existing references',
  })
  @IsOptional()
  references?: ReferenceInput[];
}
