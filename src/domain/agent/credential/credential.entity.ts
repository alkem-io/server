import { Column, Entity, ManyToOne } from 'typeorm';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class Credential extends BaseAlkemioEntity implements ICredential {
  @Column('uuid', { nullable: false })
  resourceID!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: string;

  @ManyToOne(() => Agent, agent => agent.credentials, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  agent?: Agent;

  @Column('uuid', { nullable: true })
  issuer!: string;

  @Column({ type: 'timestamp', nullable: true })
  expires?: Date;

  constructor() {
    super();
  }
}
