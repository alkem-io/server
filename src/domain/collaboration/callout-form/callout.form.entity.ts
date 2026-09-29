import { ENUM_LENGTH } from '@common/constants';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { ICalloutForm } from './callout.form.interface';
import { ICalloutFormQuestion } from './callout.form.question.interface';

@Entity()
export class CalloutForm extends BaseAlkemioEntity implements ICalloutForm {
  // Owning side sits on the form so that deleting the framing removes the
  // form and, through the response FK, every response — no delete code.
  @OneToOne('CalloutFraming', 'form', {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'framingId' })
  framing?: ICalloutFraming;

  @Column('jsonb', { nullable: false })
  questions!: ICalloutFormQuestion[];

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutFormResponseVisibility.ADMINS,
  })
  visibility!: CalloutFormResponseVisibility;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutFormResponseMode.SINGLE,
  })
  responseMode!: CalloutFormResponseMode;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    default: CalloutFormState.OPEN,
  })
  state!: CalloutFormState;
}
