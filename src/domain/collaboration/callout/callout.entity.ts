import { Entity, OneToMany, Column, ManyToOne } from 'typeorm';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { ICallout } from './callout.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { Collaboration } from '../collaboration';

@Entity()
export class Callout extends NameableEntity implements ICallout {
  @Column('text')
  description?: string;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column('text', { nullable: false, default: CalloutState.OPEN })
  state!: CalloutState;

  @OneToMany(() => Canvas, canvas => canvas.callout, {
    eager: false,
    cascade: true,
  })
  canvases?: Canvas[];

  @OneToMany(() => Aspect, aspect => aspect.callout, {
    eager: false,
    cascade: true,
  })
  aspects?: Aspect[];

  @ManyToOne(() => Collaboration, collaboration => collaboration.callouts, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  collaboration?: Collaboration;
}
