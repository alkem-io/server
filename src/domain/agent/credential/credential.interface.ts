import { AuthorizationCredential } from '@common/enums';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Credential')
export abstract class ICredential extends IBaseAlkemio {
  @Field(() => String)
  resourceID!: string;

  @Field(() => AuthorizationCredential)
  type!: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The User issuing the credential',
  })
  issuer?: string;

  expires?: Date;
}
