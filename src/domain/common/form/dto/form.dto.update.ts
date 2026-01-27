import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateFormQuestionInput } from './form.question.dto.update';

@InputType()
export class UpdateFormInput {
  @Field(() => Markdown, { nullable: false })
  description!: string;

  @Field(() => [UpdateFormQuestionInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => UpdateFormQuestionInput)
  questions!: UpdateFormQuestionInput[];
}
