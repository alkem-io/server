import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany} from 'typeorm';
import { UserGroup, Challenge, DID, Organisation, Context } from '.';


@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  name: string = '';

  @Field(() => [Challenge])
  @OneToMany(
    type => Challenge,
    challenge => challenge.ecoverse,
    { eager: true },
  )
  challenges!: Challenge[];

  @Field(() => [Organisation])
  @OneToMany(
    type => Organisation,
    organisation => organisation.partners,
    { eager: true },
  )
  partners!: Organisation[];

  @Field(() => [UserGroup])
  @OneToMany(
    type => UserGroup,
    userGroup => userGroup.ecoverseMember,
    { eager: true },
  )
  members!: UserGroup[];

  @Field(() => DID)
  @OneToOne(type => DID, did => did.ecoverse)
  DID!: DID;

  @Field(() => Organisation)
  @OneToOne(type => Organisation, organisation => organisation.ecoverseHost)
  @JoinColumn()
  ecoverseHost!: Organisation;

  @Field(() => Context)
  @OneToOne(type => Context, context => context.ecoverse)
  context!: Context;

  constructor(name: string) {
    super();
    this.name = name;
  }
  
}