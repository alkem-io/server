import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Agreement } from '../agreement/agreement.entity';
import { Challenge } from '../challenge/challenge.entity';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Project } from '../project/project.entity';
import { UserGroup } from '../user-group/user-group.entity';
import { User } from '../user/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ITagset } from './tagset.interface';
import { Profile } from '../profile/profile.entity';

@Entity()
@ObjectType()
export class Tagset extends BaseEntity implements ITagset {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field(() => [String])
  @Column('simple-array')
  tags?: string[];

  @ManyToOne(() => Profile, profile => profile.tagsets)
  profile?: Profile;

  constructor(name: string) {
    super();
    this.name = name;
  }

}

export enum RestrictedTagsetNames {
  Default = 'default',
  Skills = 'skills',
}
