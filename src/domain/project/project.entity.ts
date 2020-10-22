import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agreement } from '../agreement/agreement.entity';
import { Challenge } from '../challenge/challenge.entity';
import { Tagset } from '../tagset/tagset.entity';
import { IProject } from './project.interface';

@Entity()
@ObjectType()
export class Project extends BaseEntity implements IProject {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, { nullable: false, description: '' })
  @Column()
  name: string;

  @Field(() => String, { nullable: true, description: '' })
  @Column({ nullable: true })
  description?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc',
  })
  @Column({ nullable: true })
  lifecyclePhase?: string;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the project',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  //@Field(() => [Agreement])
  @OneToMany(
    () => Agreement,
    agreement => agreement.project,
    { eager: true, cascade: true }
  )
  agreements?: Agreement[];

  @ManyToOne(
    () => Challenge,
    challenge => challenge.projects
  )
  challenge?: Challenge;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
