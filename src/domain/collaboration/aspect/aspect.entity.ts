import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IAspect } from './aspect.interface';
import { Visual } from '@domain/common/visual/visual.entity';
import { Comments } from '@domain/communication/comments';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CardProfile } from '../card-profile';

@Entity()
export class Aspect extends NameableEntity implements IAspect {
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

  @OneToOne(() => CardProfile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile?: CardProfile;

  @ManyToOne(() => Callout, callout => callout.aspects, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  constructor(type: string) {
    super();
    this.type = type;
  }
}
