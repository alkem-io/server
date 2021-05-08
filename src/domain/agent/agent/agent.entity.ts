import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IAgent } from '@domain/agent/agent';
import { ICredential, Credential } from '@domain/agent/credential';
import { User } from '@domain/community/user';

@Entity()
@ObjectType()
export class Agent extends BaseEntity implements IAgent {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  //todo: replace with output DID that resolves to a string
  @Field(() => String, {
    nullable: true,
    description: 'The Decentralized Identifier (DID) for this Agent.',
  })
  @Column('varchar', { length: 255, nullable: true })
  did?: string;

  @Column()
  password?: string;

  @Field(() => [Credential], {
    nullable: true,
    description: 'The Credentials held by this Agent.',
  })
  @OneToMany(
    () => Credential,
    credential => credential.agent,
    {
      eager: true,
      cascade: true,
    }
  )
  credentials?: ICredential[];

  @OneToOne(
    () => User,
    user => user.agent,
    { eager: false, cascade: false }
  )
  user?: User;

  // Constructor
  constructor() {
    super();
    this.did = '';
    this.password = '';
  }
}
