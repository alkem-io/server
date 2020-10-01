import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agreement, Challenge, Tagset, RestrictedTagsetNames } from '.';
import { IProject } from 'src/interfaces/IProject';
import { ITaggable } from '../interfaces';

@Entity()
@ObjectType()
export class Project extends BaseEntity implements IProject, ITaggable {
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
    description: 'The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc',
  })
  @Column({ nullable: true })
  lifecyclePhase?: string;

  @Field(() => Tagset, { nullable: true, description: 'The set of tags for the project' })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  //@Field(() => [Agreement])
  @OneToMany(() => Agreement, agreement => agreement.project, { eager: true, cascade: true })
  agreements?: Agreement[];

  @ManyToOne(() => Challenge, challenge => challenge.projects)
  challenge?: Challenge;

  constructor(name: string) {
    super();
    this.name = name;
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
    this.tagset.initialiseMembers();
  }
}
