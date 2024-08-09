import { AgentType } from '@common/enums/agent.type';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { DID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Agent')
export abstract class IAgent extends IAuthorizable {
  @Field(() => DID, {
    nullable: true,
    description: 'The Decentralized Identifier (DID) for this Agent.',
  })
  did!: string;

  @Field(() => [ICredential], {
    nullable: true,
    description: 'The Credentials held by this Agent.',
  })
  credentials?: ICredential[];

  // used for accessing the SSI store
  password!: string;

  @Field(() => AgentType, {
    nullable: true,
    description: 'A type of entity that this Agent is being used with.',
  })
  type!: string;
}
