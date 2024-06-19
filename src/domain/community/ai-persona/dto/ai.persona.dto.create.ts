import { HUGE_TEXT_LENGTH } from '@common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateAiPersonaInput {
  @Field(() => Markdown, { nullable: false })
  @MaxLength(HUGE_TEXT_LENGTH)
  description!: string;
}
