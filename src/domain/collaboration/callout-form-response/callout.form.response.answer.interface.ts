import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutFormAnswerOption')
export abstract class ICalloutFormAnswerOption {
  @Field(() => UUID, { nullable: false })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The label of the option as it was when the response was given.',
  })
  label!: string;
}

@ObjectType('CalloutFormAnswer')
export abstract class ICalloutFormAnswer {
  @Field(() => UUID, { nullable: false })
  questionID!: string;

  @Field(() => String, {
    nullable: false,
    description:
      'The question text as it was when the response was given (snapshot).',
  })
  prompt!: string;

  @Field(() => CalloutFormQuestionType, {
    nullable: false,
    description:
      'The question type as it was when the response was given (snapshot).',
  })
  type!: CalloutFormQuestionType;

  @Field(() => String, {
    nullable: true,
    description: 'The answer to a text question.',
  })
  text?: string;

  @Field(() => [ICalloutFormAnswerOption], {
    nullable: true,
    description: 'The selected options of a choice question.',
  })
  selectedOptions?: ICalloutFormAnswerOption[];
}
