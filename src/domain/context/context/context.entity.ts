import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Aspect, IContext } from '@domain/context';
import { EcosystemModel } from '../ecosystem-model';
import { Reference } from '@domain/common/reference';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';
@Entity()
export class Context extends BaseCherrytwistEntity implements IContext {
  @Column('varchar', { length: 255, nullable: true })
  tagline?: string = '';

  @Column('text', { nullable: true })
  background?: string = '';

  @Column('text', { nullable: true })
  vision?: string = '';

  @Column('text', { nullable: true })
  impact?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

  @OneToMany(
    () => Reference,
    reference => reference.context,
    { eager: true, cascade: true }
  )
  references?: Reference[];

  @OneToOne(() => EcosystemModel, { eager: false, cascade: true })
  @JoinColumn()
  ecosystemModel?: EcosystemModel;

  @OneToMany(
    () => Aspect,
    aspect => aspect.context,
    { eager: false, cascade: true }
  )
  aspects?: Aspect[];

  constructor() {
    super();
  }
}
