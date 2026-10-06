import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

// The maximum answer length depends on the question type (512 short / 2048 long)
// and is enforced by the response service with a reason code, never here.
@InputType('CalloutFormAnswerInput')
export class CalloutFormAnswerInput {
  @Field(() => UUID, { nullable: false })
  @IsUUID()
  questionID!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The answer to a text question.',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @Field(() => [UUID], {
    nullable: true,
    description: 'The selected option IDs of a choice question.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  selectedOptionIDs?: string[];
}
