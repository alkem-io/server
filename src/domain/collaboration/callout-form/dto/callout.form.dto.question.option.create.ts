import { MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

@InputType('CreateCalloutFormQuestionOptionInput')
@ObjectType('CreateCalloutFormQuestionOptionData')
export class CreateCalloutFormQuestionOptionInput {
  @Field(() => String, {
    nullable: false,
    description: 'The label of the option. Unique within the question.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'label must not be blank' })
  @MaxLength(MID_TEXT_LENGTH)
  label!: string;
}
