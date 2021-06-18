import { ICredential } from '@domain/agent/credential/credential.interface';
import { IAuthorizable } from '@domain/common/authorizable-entity';
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

  // primarily used to give meaningful error messages if something goes wrong with the agent
  parentDisplayID?: string;

  // used for accessing the SSI store
  password!: string;
}
