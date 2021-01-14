import { Field, InputType } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class TagsetInput {
  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  name!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
