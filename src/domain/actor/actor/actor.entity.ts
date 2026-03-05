import { ActorType } from '@common/enums/actor.type';
import { Credential } from '@domain/actor/credential/credential.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { Entity, OneToMany, TableInheritance } from 'typeorm';
import { IActor } from './actor.interface';

@Entity('actor')
@TableInheritance({ pattern: 'CTI', column: { type: 'varchar', name: 'type' } })
export class Actor extends NameableEntity implements IActor {
  // CTI discriminator — auto-managed by TypeORM.
  // Value is set by @ChildEntity({ discriminatorValue }) on each child.
  // Populated automatically on load; do NOT declare @Column here.
  type!: ActorType;

  // nameID and profile are inherited from NameableEntity → actor table
  // authorization is inherited from AuthorizableEntity → actor table

  @OneToMany(
    () => Credential,
    credential => credential.actor,
    {
      eager: false,
      cascade: true,
    }
  )
  credentials?: Credential[];

  constructor() {
    super();
  }
}
