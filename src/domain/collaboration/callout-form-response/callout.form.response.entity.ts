import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { User } from '@domain/community/user/user.entity';
import {
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ICalloutForm } from '../callout-form/callout.form.interface';
import { ICalloutFormAnswer } from './callout.form.response.answer.interface';
import { ICalloutFormResponse } from './callout.form.response.interface';

@Entity()
@Index('IDX_callout_form_response_form_row', ['formId', 'rowId'])
@Index('IDX_callout_form_response_form_created_by', ['formId', 'createdBy'])
export class CalloutFormResponse
  extends BaseAlkemioEntity
  implements ICalloutFormResponse
{
  // Keyset for the relay pagination helper; submission order.
  @Column({ nullable: false })
  @Generated('increment')
  rowId!: number;

  @Column('uuid', { nullable: false })
  formId!: string;

  @ManyToOne('CalloutForm', {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'formId' })
  form?: ICalloutForm;

  // NULL after the submitter's account was deleted; the answers are kept.
  @Column('uuid', { nullable: true })
  createdBy?: string | null;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User;

  @Column('jsonb', { nullable: false })
  answers!: ICalloutFormAnswer[];
}
