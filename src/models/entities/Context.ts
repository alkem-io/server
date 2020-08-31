import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, ManyToOne} from 'typeorm';
import { Tag } from '.';
import { Challenge } from './Challenge';
import { Ecoverse } from './Ecoverse';

@Entity()
@ObjectType()
export class Context extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String, {nullable: true})
  @Column()
  description?: string = '';

  @Field(() => String, {nullable: true})
  @Column()
  vision?: string = '';

  @Field(() => String, {nullable: true})
  @Column()
  principles?: string = '';

  @Field(() => String, {nullable: true, description: "A list of URLs that provide additional context."})
  @Column()
  refernceLinks?: string = '';

  /* Need to make referenceLinks + others into string arrays or a full type
  @Field(() => [String])
  @Column("simple-array")
  referenceLinks?: string[];*/


}