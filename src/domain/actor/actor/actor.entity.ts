import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { IActor } from './actor.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Credential } from '@domain/actor/credential/credential.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ActorType } from '@common/enums/actor.type';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
@TableInheritance({
  column: { type: 'varchar', name: 'type', length: ENUM_LENGTH },
})
export class Actor extends AuthorizableEntity implements IActor {
  // Type discriminator - populated automatically by TypeORM for child entities
  @Column('varchar', { length: ENUM_LENGTH })
  type!: ActorType;

  // nameID is NOT on Actor base table - each child entity defines its own nameID column
  // This keeps the Actor table lightweight and avoids data duplication

  // Optional profile reference (null for Space, Account)
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'profileId' })
  profile?: Profile;

  @Column('uuid', { nullable: true })
  profileId?: string;

  // Credentials owned by this actor
  @OneToMany(() => Credential, credential => credential.actor, {
    eager: true,
    cascade: true,
  })
  credentials?: Credential[];

  constructor() {
    super();
  }
}
