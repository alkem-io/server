import { ENUM_LENGTH } from '@common/constants';
import { AgentType } from '@common/enums/agent.type';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { Credential } from '@domain/agent/credential/credential.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class Agent extends AuthorizableEntity implements IAgent {
  @OneToMany(
    () => Credential,
    credential => credential.agent,
    {
      eager: true,
      cascade: true,
    }
  )
  credentials?: Credential[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: true })
  type!: AgentType;
}
