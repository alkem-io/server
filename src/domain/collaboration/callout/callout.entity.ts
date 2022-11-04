import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Canvas } from '../../common/canvas/canvas.entity';
import { Aspect } from '../../collaboration/aspect/aspect.entity';
import { NameableEntity } from '../../common/entity/nameable-entity/nameable.entity';
import { ICallout } from './callout.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Collaboration } from '../../collaboration/collaboration/collaboration.entity';
import { Comments } from '../../communication/comments/comments.entity';
import { AspectTemplate } from '../../template/aspect-template/aspect.template.entity';

@Entity()
export class Callout extends NameableEntity implements ICallout {
  @Column('text', { nullable: false })
  description!: string;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column('text', { nullable: false, default: CalloutState.OPEN })
  state!: CalloutState;

  @Column('text', { nullable: false, default: CalloutVisibility.DRAFT })
  visibility!: CalloutVisibility;

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

  @OneToOne(() => AspectTemplate, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  cardTemplate?: AspectTemplate;

  @OneToOne(() => Comments, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments?: Comments;

  @ManyToOne(() => Collaboration, collaboration => collaboration.callouts, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  collaboration?: Collaboration;

  @Column('int', { default: 10 })
  sortOrder!: number;
}
