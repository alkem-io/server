import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IAspect } from './aspect.interface';
import { Visual } from '@domain/common/visual/visual.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { Comments } from '@domain/communication/comments';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';

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
  comments?: Comments;

  @OneToMany(() => Reference, reference => reference.aspect, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @ManyToOne(() => Callout, callout => callout.aspects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset?: Tagset;

  constructor(type: string, description: string) {
    super();
    this.type = type;
    this.description = description;
  }
}
