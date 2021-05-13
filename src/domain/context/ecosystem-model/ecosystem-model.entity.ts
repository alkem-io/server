import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { ActorGroup } from '@domain/context';

@Entity()
@ObjectType()
export class EcosystemModel extends BaseEntity implements IEcosystemModel {
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
    nullable: true,
    description: 'Overview of this ecosystem model.',
  })
  @Column('varchar', { length: 255, nullable: true })
  description?: string = '';

  @Field(() => [ActorGroup], {
    nullable: true,
    description: 'A list of ActorGroups',
  })
  @OneToMany(
    () => ActorGroup,
    actorGroup => actorGroup.ecosystemModel,
    { eager: true, cascade: true }
  )
  actorGroups?: ActorGroup[];

  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  // Constructor
  constructor() {
    super();
    this.restrictedActorGroupNames = [];
  }
}
