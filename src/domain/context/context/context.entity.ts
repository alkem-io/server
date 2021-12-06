import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IContext } from '@domain/context/context/context.interface';
import { EcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Visual } from '../visual/visual.entity';
import { Canvas } from '@domain/common/canvas';
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

  @OneToMany(() => Canvas, canvas => canvas.context, {
    eager: false,
    cascade: true,
  })
  canvases?: Canvas[];

  @OneToMany(() => Reference, reference => reference.context, {
    eager: false,
    cascade: true,
  })
  references?: Reference[];

  @OneToOne(() => EcosystemModel, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  ecosystemModel?: EcosystemModel;

  @OneToOne(() => Visual, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  visual?: Visual;

  @OneToMany(() => Aspect, aspect => aspect.context, {
    eager: false,
    cascade: true,
  })
  aspects?: Aspect[];

  constructor() {
    super();
  }
}
