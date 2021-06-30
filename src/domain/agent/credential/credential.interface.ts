import { AuthorizationCredential } from '@common/enums';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Credential')
export abstract class ICredential extends IBaseAlkemio {
  @Field(() => String)
  resourceID!: string;

  @Field(() => AuthorizationCredential)
  type!: string;
}
