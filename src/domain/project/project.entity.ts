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
import { Aspect } from '../aspect/aspect.entity';
import { Opportunity } from '../opportunity/opportunity.entity';
import { Tagset } from '../tagset/tagset.entity';
import { IProject } from './project.interface';

@Entity()
@ObjectType()
export class Project extends BaseEntity implements IProject {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Opportunity',
  })
  @Column('varchar', { length: 20 })
  textID: string;

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
  state: string;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the project',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  @Field(() => [Aspect], {
    nullable: true,
    description: 'The set of aspects for this Project. Note: likley to change.',
  })
  @OneToMany(
    () => Aspect,
    aspect => aspect.project,
    { eager: true, cascade: true }
  )
  aspects?: Aspect[];

  //@Field(() => [Agreement])
  @OneToMany(
    () => Agreement,
    agreement => agreement.project,
    { eager: true, cascade: true }
  )
  agreements?: Agreement[];

  @ManyToOne(
    () => Opportunity,
    opportunity => opportunity.projects
  )
  opportunity?: Opportunity;

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
    this.state = '';
  }
}
