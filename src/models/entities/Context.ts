import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn} from 'typeorm';
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
  description: string = '';

  @Field(() => String)
  @Column()
  vision: string = '';

  @Field(() => String)
  @Column()
  principles: string = '';

  @Field(() => String)
  @Column()
  referenceLinks: string = '';

  //@Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.context,
    { eager: true },
  )
  tags?: Tag[];

  //@Field(() => Ecoverse)
  @OneToOne(type => Ecoverse, ecoverse => ecoverse.context)
  @JoinColumn()
  ecoverse?: Ecoverse;

  //@Field(() => Challenge)
  @OneToOne(type => Challenge, challenge => challenge.context)
  @JoinColumn()
  challenge?: Challenge;


}