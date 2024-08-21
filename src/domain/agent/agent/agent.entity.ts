import { Column, Entity, OneToMany } from 'typeorm';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ENUM_LENGTH } from '@common/constants';
import { AgentType } from '@common/enums/agent.type';

@Entity()
export class Agent extends AuthorizableEntity implements IAgent {
  //todo: replace with output DID that resolves to a string
  @Column('varchar', { length: 255, nullable: true })
  did!: string;

  @Column('varchar', { length: 255, nullable: true })
  password!: string;

  @OneToMany(() => Credential, credential => credential.agent, {
    eager: true,
    cascade: true,
  })
  credentials?: Credential[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: AgentType;

  constructor() {
    super();
    this.did = '';
    this.password = '';
  }
}
