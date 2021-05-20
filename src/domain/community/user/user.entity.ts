import { Profile } from '@domain/community/profile';
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { IUser } from './user.interface';
import { Application } from '@domain/community/application/application.entity';
import { Agent } from '@domain/agent/agent';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class User extends BaseCherrytwistEntity implements IUser {
  @Column()
  name: string;

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

  @OneToOne(() => Profile, { eager: true, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  profile?: Profile;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  agent?: Agent;

  @OneToMany(
    () => Application,
    application => application.id,
    { eager: false, cascade: false }
  )
  applications?: Application[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
