import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IAspect } from './aspect.interface';
import { Comments } from '@domain/communication/comments';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

@Entity()
export class Aspect extends NameableEntity implements IAspect {
  @Column('text')
  type!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @OneToOne(() => Comments, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments?: Comments;

  @ManyToOne(() => Callout, callout => callout.aspects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  constructor() {
    super();
  }
}
