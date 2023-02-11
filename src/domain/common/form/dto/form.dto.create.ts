import { CreateFormQuestionInput } from './form.question.dto.create';

export class CreateFormInput {
  description!: string;

  questions!: CreateFormQuestionInput[];
}
