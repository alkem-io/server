import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Column, JoinColumn, OneToOne } from 'typeorm';

export abstract class NameableEntity extends AuthorizableEntity {
  @Column('varchar', { length: NAMEID_MAX_LENGTH_SCHEMA, nullable: false })
  nameID!: string;

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;
}
