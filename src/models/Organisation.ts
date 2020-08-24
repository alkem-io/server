import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { DID, Tag, User } from '.';
import { Ecoverse } from './Ecoverse';

@Entity()
// @Index([ 'ecoverse', 'organisation' ], { unique: true })
@ObjectType()
export class Organisation extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';
  
  @Field(() => DID)
  @OneToOne(type => DID, did => did.organisation)
  DID!: DID;

  @Field(() => Ecoverse)
  @OneToOne(type => Ecoverse, ecoverse => ecoverse.ecoverseHost)
  ecoverseHost!: Ecoverse;

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.organisation,
    { eager: true },
  )
  tags!: Tag[];

  @Field(() => [User])
  @OneToMany(
    type => User,
    user => user.member,
    { eager: true },
  )
  members!: User[];

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.partners
  )
  partners!: Ecoverse;

  constructor(name: string) {
    super();
    this.name = name;
  }
}