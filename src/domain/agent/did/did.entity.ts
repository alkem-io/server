import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IDID } from './did.interface';

@Entity()
@ObjectType()
export class DID extends BaseEntity implements IDID {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

  @Field(() => String)
  @Column()
  DID: string;

  @Field(() => String)
  @Column()
  DDO: string;

  constructor(DID: string, DDO: string) {
    super();
    this.DID = DID;
    this.DDO = DDO;
  }
}
