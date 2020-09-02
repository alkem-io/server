import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, OneToMany } from 'typeorm';
import { DID, Tag, Challenge, Agreement } from '.';

@Entity()
@ObjectType()
export class Project extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String, {nullable: false,  description: ""})
  @Column()
  name: string = '';

  @Field(() => String, {nullable: true,  description: ""})
  @Column()
  description: string = '';

  @Field(() => String, {nullable: true,  description: "The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc"})
  @Column()
  lifecyclePhase: string = '';

  @Field(() => [Tag], {nullable: true, description: "The set of tags for this Project"})
  @OneToMany(
    type => Tag,
    tag => tag.project,
    { eager: true },
  )
  tags?: Tag[];
  
  //@Field(() => [Agreement])
  @OneToMany(
    type => Agreement,
    agreement => agreement.project,
    { eager: true },
  )
  agreements?: Agreement[];


  @ManyToOne(
    type => Challenge,
    challenge => challenge.projects
  )
  challenge?: Challenge;

  constructor(name: string) {
    super();
    this.name = name;
  }

}