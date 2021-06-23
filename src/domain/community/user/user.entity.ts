import { Profile } from '@domain/community/profile/profile.entity';
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { IUser } from '@domain/community/user/user.interface';
import { Application } from '@domain/community/application/application.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';

@Entity()
export class User extends NameableEntity implements IUser {
  @Column()
  accountUpn: string = '';

  @Column()
  firstName: string = '';

  @Column()
  lastName: string = '';

  @Column()
  email: string = '';

  @Column()
  phone: string = '';

  @Column()
  city: string = '';

  @Column()
  country: string = '';

  @Column()
  gender: string = '';

  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  profile?: Profile;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  @OneToMany(
    () => Application,
    application => application.id,
    { eager: false, cascade: false }
  )
  applications?: Application[];

  constructor() {
    super();
  }
}
