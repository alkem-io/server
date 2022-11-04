import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IContext } from '../../context/context/context.interface';
import { EcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.entity';
import { Reference } from '../../common/reference/reference.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Visual } from '../../common/visual/visual.entity';
import { Location } from '@domain/common/location/location.entity';
@Entity()
export class Context extends AuthorizableEntity implements IContext {
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

  @OneToMany(() => Reference, reference => reference.context, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @OneToOne(() => Location, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  location?: Location;

  @OneToOne(() => EcosystemModel, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  ecosystemModel?: EcosystemModel;

  @OneToMany(() => Visual, visual => visual.context, {
    eager: false,
    cascade: true,
  })
  visuals?: Visual[];

  constructor() {
    super();
  }
}
