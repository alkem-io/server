import { IFormQuestion } from './form.dto.question.interface';

export abstract class FormQuestion implements IFormQuestion {
  question!: string;

  explanation!: string;

  sortOrder!: number;

  maxLength!: number;
}
