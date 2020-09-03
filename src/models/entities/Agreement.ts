import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Tag, Project } from '.';

@Entity()
@ObjectType()
export class Agreement extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => String)
  @Column()
  description: string = '';

  @ManyToOne(
    type => Project,
    project => project.agreements
  )
  project?: Project;

  @Field(() => [Tag], { nullable: true, description: "The set of tags for this Agreement e.g. Team, Nature etc." })
  @ManyToMany(
    type => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable()
  tags?: Tag[];

  constructor(name: string) {
    super();
    this.name = name;
  }

}