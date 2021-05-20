import { IAgent } from '@domain/agent/agent';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Credential')
export abstract class ICredential extends IBaseCherrytwist {
  agent?: IAgent;

  @Field(() => Number)
  resourceID!: number;

  @Field(() => String)
  type!: string;
}
