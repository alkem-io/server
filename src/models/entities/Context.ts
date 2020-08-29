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

  @Field(() => String)
  @Column()
  description?: string = '';

  @Field(() => String)
  @Column()
  vision?: string = '';

  @Field(() => String)
  @Column()
  principles?: string = '';

  @Field(() => String)
  @Column()
  refernceLinks?: string = '';

  /* Need to make referenceLinks + others into string arrays or a full type
  @Field(() => [String])
  @Column("simple-array")
  referenceLinks?: string[];*/

  @OneToOne(type => Ecoverse, ecoverse => ecoverse.context)
  ecoverse?: Ecoverse;

  @OneToOne(type => Challenge, challenge => challenge.context)
  challenge?: Challenge;


}