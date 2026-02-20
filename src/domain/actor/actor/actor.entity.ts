import { ENUM_LENGTH } from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { Credential } from '@domain/actor/credential/credential.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IActor } from './actor.interface';

@Entity()
export class Actor extends AuthorizableEntity implements IActor {
  // Type discriminator - identifies which child entity this actor represents
  @Column('varchar', { length: ENUM_LENGTH })
  type!: ActorType;

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

  // Credentials owned by this actor - lazy loaded, use ActorService/ActorLookupService
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
