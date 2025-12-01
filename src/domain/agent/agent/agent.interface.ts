import { AgentType } from '@common/enums/agent.type';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Agent')
export abstract class IAgent extends IAuthorizable {
  @Field(() => [ICredential], {
    nullable: true,
    description: 'The Credentials held by this Agent.',
  })
  credentials?: ICredential[];

  @Field(() => AgentType, {
    nullable: false,
    description: 'A type of entity that this Agent is being used with.',
  })
  type!: AgentType;
}
