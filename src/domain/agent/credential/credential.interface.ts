import { CredentialType } from '@common/enums/credential.type';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAgent } from '../agent';

@ObjectType('Credential')
export abstract class ICredential extends IBaseAlkemio {
  @Field(() => String)
  resourceID!: string;

  @Field(() => CredentialType)
  type!: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The User issuing the credential',
  })
  issuer?: string;

  expires?: Date;

  agent?: IAgent;

  @Field(() => Date)
  createdDate?: Date;

  @Field(() => Date)
  updatedDate?: Date;
}
