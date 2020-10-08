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
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ITag } from './tag.interface';

@Entity()
@ObjectType()
export class Tag extends BaseEntity implements ITag {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string;

  @ManyToMany(
    () => Challenge,
    challenge => challenge.tags
  )
  challenges?: Challenge;

  @ManyToMany(
    () => Project,
    project => project.tags
  )
  projects?: Project;

  @ManyToMany(
    () => Organisation,
    organisation => organisation.tags
  )
  organisations?: Organisation;

  @ManyToMany(
    () => Ecoverse,
    ecoverse => ecoverse.tags
  )
  ecoverses?: Ecoverse[];

  @ManyToMany(
    () => User,
    user => user.tags
  )
  users?: User;

  @ManyToMany(
    () => UserGroup,
    userGroup => userGroup.tags
  )
  userGroups?: UserGroup;

  @ManyToMany(
    () => Agreement,
    agreement => agreement.tags
  )
  agreements?: Agreement[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}
