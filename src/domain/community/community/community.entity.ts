import { ID, Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IGroupable } from '@src/common/interfaces/groupable.interface';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { ICommunity } from '@domain/community/community';
import { Challenge, Ecoverse, Opportunity } from '@domain/challenge';
import { Application, IApplication } from '@domain/community/application';

@Entity()
@ObjectType()
export class Community extends BaseEntity implements ICommunity, IGroupable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the Community',
  })
  @Column()
  name: string;

  @Field(() => String, {
    nullable: false,
    description: 'The type of the Community',
  })
  @Column()
  type: string;

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.community,
    { eager: true, cascade: true }
  )
  groups?: UserGroup[];

  @OneToMany(
    () => Application,
    application => application.community,
    { eager: true, cascade: true }
  )
  applications?: IApplication[];

  @OneToOne(
    () => Ecoverse,
    ecoverse => ecoverse.community,
    { eager: false, cascade: false }
  )
  ecoverse?: Ecoverse;

  @OneToOne(
    () => Challenge,
    challenge => challenge.community,
    { eager: false, cascade: false }
  )
  challenge?: Challenge;

  @OneToOne(
    () => Opportunity,
    opportunity => opportunity.community,
    { eager: false, cascade: false }
  )
  opportunity?: Opportunity;

  // The parent community can have many child communities; the relationship is controlled by the child.
  @ManyToOne(() => Community, { eager: false, cascade: false })
  parentCommunity?: Community;

  constructor(name: string, communityType: string) {
    super();
    this.name = name;
    this.type = communityType;
  }
}
