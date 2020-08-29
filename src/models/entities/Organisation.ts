import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { DID, Tag, User, Ecoverse } from '.';

@Entity()
@ObjectType()
export class Organisation extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';
  
  @OneToOne(type => DID, did => did.organisation)
  DID!: DID;

  @OneToOne(type => Ecoverse, ecoverse => ecoverse.ecoverseHost)
  ecoverseHost?: Ecoverse;

  @ManyToOne(
    type => Ecoverse,
    ecoverse => ecoverse.partners
  )
  ecoverse?: Ecoverse;

  @Field(() => [Tag])
  @OneToMany(
    type => Tag,
    tag => tag.organisation,
    { eager: true },
  )
  tags?: Tag[];

  @Field(() => [User])
  @OneToMany(
    type => User,
    user => user.member,
    { eager: true },
  )
  members?: User[];

  constructor(name: string) {
    super();
    this.name = name;
  }
}