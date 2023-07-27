import {
  Entity,
  OneToMany,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { ICallout } from './callout.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { PostTemplate } from '@domain/template/post-template/post.template.entity';
import { WhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.entity';
import { Room } from '@domain/communication/room/room.entity';

@Entity()
export class Callout extends NameableEntity implements ICallout {
  @Column('text', { nullable: false })
  type!: CalloutType;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @Column('text', { nullable: false, default: CalloutState.OPEN })
  state!: CalloutState;

  @Column('text', { nullable: false, default: CalloutVisibility.DRAFT })
  visibility!: CalloutVisibility;

  @OneToMany(() => Whiteboard, whiteboard => whiteboard.callout, {
    eager: false,
    cascade: true,
  })
  whiteboards?: Whiteboard[];

  @OneToMany(() => Post, post => post.callout, {
    eager: false,
    cascade: true,
  })
  posts?: Post[];

  @OneToOne(() => PostTemplate, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  postTemplate?: PostTemplate;

  @OneToOne(() => WhiteboardTemplate, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  whiteboardTemplate?: WhiteboardTemplate;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

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
