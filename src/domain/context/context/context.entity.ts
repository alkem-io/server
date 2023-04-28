import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IContext } from '@domain/context/context/context.interface';
import { EcosystemModel } from '@domain/context/ecosystem-model/ecosystem-model.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class Context extends AuthorizableEntity implements IContext {
  @Column('text', { nullable: true })
  vision?: string = '';

  @Column('text', { nullable: true })
  impact?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

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
