import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { IForm } from './form.interface';

export class Form extends BaseAlkemioEntity implements IForm {
  questions!: string;

  description!: string;
}
