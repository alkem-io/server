import { ENUM_LENGTH } from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { Credential } from '@domain/actor/credential/credential.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { IActor } from './actor.interface';

@Entity()
export class Actor extends NameableEntity implements IActor {
  // Type discriminator - identifies which child entity this actor represents
  @Column('varchar', { length: ENUM_LENGTH })
  type!: ActorType;

  // nameID and profile are inherited from NameableEntity
  // profileId column is auto-managed by NameableEntity's @JoinColumn()

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
