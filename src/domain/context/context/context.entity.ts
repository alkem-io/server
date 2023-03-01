import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IContext } from '@domain/context/context/context.interface';
import { EcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.entity';
import { Reference } from '@domain/common/reference/reference.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
@Entity()
export class Context extends AuthorizableEntity implements IContext {
  @Column('text', { nullable: true })
  background?: string = '';

  @Column('text', { nullable: true })
  vision?: string = '';

  @Column('text', { nullable: true })
  impact?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

  @OneToMany(() => Reference, reference => reference.contextRecommendation, {
    eager: false,
    cascade: true,
  })
  recommendations?: Reference[];

  @OneToOne(() => EcosystemModel, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  ecosystemModel?: EcosystemModel;

  constructor() {
    super();
  }
}
