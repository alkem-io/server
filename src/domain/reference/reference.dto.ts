import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, MID_TEXT_LENGTH } from '@constants';
import { IsDataURI, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class ReferenceInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsDataURI()
  uri!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
