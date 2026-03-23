import { MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdatePollInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Updated title for the Poll (max 512 chars). This is the only mutable property once a poll is created; options are managed via separate mutations.',
  })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  title?: string;
}
