import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IDID } from 'src/interfaces/IDID';

@Entity()
@ObjectType()
export class DID extends BaseEntity implements IDID {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

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
