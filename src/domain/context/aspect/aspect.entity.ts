import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IAspect } from './aspect.interface';
import { Context } from '@domain/context/context/context.entity';
import { Visual } from '@domain/common/visual/visual.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { NameableEntity } from '@domain/common';
import { Comments } from '@domain/communication/comments';
import { IComments } from '@domain/communication/comments/comments.interface';

@Entity()
export class Aspect extends NameableEntity implements IAspect {
  @Column('text')
  description: string;

  @Column('text')
  type: string;

  @Column('varchar', { length: 36, nullable: true })
  createdBy!: string;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  banner?: Visual;

  @OneToOne(() => Visual, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  bannerNarrow?: Visual;

  @OneToOne(() => Comments, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments?: IComments;

  @OneToMany(() => Reference, reference => reference.aspect, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @ManyToOne(() => Context, context => context.aspects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  context?: Context;

  constructor(type: string, description: string) {
    super();
    this.type = type;
    this.description = description;
  }
}
