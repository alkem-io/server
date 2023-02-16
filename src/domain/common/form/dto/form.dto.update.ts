import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateFormQuestionInput } from './form.question.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';

@InputType()
export class UpdateFormInput {
  @Field(() => Markdown, { nullable: false })
  description!: string;

  @Field(() => [UpdateFormQuestionInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => UpdateFormQuestionInput)
  questions!: UpdateFormQuestionInput[];
}
