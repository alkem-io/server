import { Column, Entity, ManyToOne } from 'typeorm';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';

@Entity()
export class Credential extends BaseAlkemioEntity implements ICredential {
  @Column()
  resourceID!: string;

  @Column()
  type!: string;

  @ManyToOne(() => Agent, agent => agent.credentials, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  agent?: Agent;

  constructor() {
    super();
  }
}
