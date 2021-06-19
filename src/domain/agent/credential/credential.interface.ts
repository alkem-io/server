import { IAgent } from '@domain/agent/agent/agent.interface';
import { AuthorizationCredential } from '@common/enums';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Credential')
export abstract class ICredential extends IBaseCherrytwist {
  agent?: IAgent;

  @Field(() => String)
  resourceID!: string;

  @Field(() => AuthorizationCredential)
  type!: string;
}
