import { VERY_LONG_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CommunicationCreateDiscussionInput {
  @Field(() => String, { nullable: false })
  communicationID!: string;

  @Field(() => String, { nullable: false })
  title!: string;

  @Field(() => String, { nullable: false })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  value!: string;
}
