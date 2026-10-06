import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutFormQuestionOption')
export abstract class ICalloutFormQuestionOption {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the option, stable across edits of the Form.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The label shown to the respondent.',
  })
  label!: string;
}

@ObjectType('CalloutFormQuestion')
export abstract class ICalloutFormQuestion {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the question, stable across edits of the Form.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The question text.',
  })
  prompt!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Optional helper text shown under the question.',
  })
  explanation?: string;

  @Field(() => CalloutFormQuestionType, {
    nullable: false,
    description: 'The answer type of the question.',
  })
  type!: CalloutFormQuestionType;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether an answer is required to submit a response.',
  })
  required!: boolean;

  @Field(() => [ICalloutFormQuestionOption], {
    nullable: true,
    description:
      'The selectable options. Present for the two choice types, absent for the text types.',
  })
  options?: ICalloutFormQuestionOption[];
}
