import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Ecoverse, User, Organisation, Challenge, Project } from '.';

@Entity()
@ObjectType()
export class DID extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number | null = null;

  @Field(() => String)
  @Column()
  DID: string = '';

  @Field(() => String)
  @Column()
  DDO: string = '';

  @OneToOne(type => Ecoverse, ecoverse => ecoverse.DID)
  @JoinColumn()
  ecoverse!: Ecoverse;

  @OneToOne(type => Organisation, organisation => organisation.DID)
  @JoinColumn()
  organisation!: Organisation;

  @OneToOne(type => User, user => user.DID)
  @JoinColumn()
  user!: User;

  @OneToOne(type => Challenge, challenge => challenge.DID)
  @JoinColumn()
  challenge!: Challenge;

  @OneToOne(type => Project, project => project.DID)
  @JoinColumn()
  project!: Project;

  constructor(DID: string, DDO: string) {
    super();
    this.DID = DID;
    this.DDO = DDO;
  }

}