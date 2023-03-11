import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { ICallout } from './callout.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Comments } from '@domain/communication/comments/comments.entity';
import { AspectTemplate } from '@domain/template/aspect-template/aspect.template.entity';
import { CanvasTemplate } from '@domain/template/canvas-template/canvas.template.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Profile } from '@domain/common/profile/profile.entity';

@Entity()
export class Callout extends NameableEntity implements ICallout {
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;

  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

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

  @OneToOne(() => CanvasTemplate, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  canvasTemplate?: CanvasTemplate;

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

  activity!: number;

  @Column('char', { length: 36, nullable: true })
  publishedBy!: string;

  @Column('datetime')
  publishedDate!: Date;
}
