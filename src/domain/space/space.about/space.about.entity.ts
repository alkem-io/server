import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { ISpaceAbout } from './space.about.interface';

@Entity()
export class SpaceAbout extends AuthorizableEntity implements ISpaceAbout {
  @Column('text', { nullable: true })
  why?: string = '';

  @Column('text', { nullable: true })
  who?: string = '';

  @Column('text', { nullable: true })
  when?: string = '';

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile!: Profile;
}
