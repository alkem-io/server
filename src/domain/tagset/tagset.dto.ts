import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class TagsetInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
