import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { IForm } from './form.interface';

@Entity()
export class Form extends BaseAlkemioEntity implements IForm {
  @Column('text')
  questions!: string;

  @Column('text', { nullable: true })
  description = '';
}
